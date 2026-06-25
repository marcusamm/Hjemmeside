const express = require("express");
const http = require("http");
const fs = require("fs");
const path = require("path");

// ============================================================================
// Environment Configuration
// ============================================================================

function loadEnvFile() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile();

// ============================================================================
// Dependencies & Server Setup
// ============================================================================

const { Server } = require("socket.io");
const { getCrconMap, getCrconLiveState, getCrconPlayers, requestCrcon } = require("./crcon");
const { HLL_MAPS, mapById, normalizeMapId } = require("./hllMaps");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static("public"));

// ============================================================================
// State Management
// ============================================================================

let currentMapId = null;
const markersByMap = Object.fromEntries(HLL_MAPS.map((map) => [map.id, []]));
let rconStatus = {
  configured: false,
  connected: false,
  error: null,
  lastMapName: null,
  lastCheckedAt: null
};
let liveState = {
  score: { allied: 0, axis: 0 },
  players: [],
  playersError: null,
  playerCounts: null,
  updatedAt: null
};

// ============================================================================
// Utility Functions
// ============================================================================

function stripLegacyArrows(data) {
  return Array.isArray(data) ? data.filter((m) => m.type !== "arrow") : [];
}

function mapPayload(map) {
  if (!map) return null;
  const imagePath = path.join(__dirname, "public", map.image);
  const hasImage = fs.existsSync(imagePath);
  return {
    ...map,
    image: hasImage ? map.image : `/api/maps/${map.id}/placeholder.svg`,
    hasImage
  };
}

function serverState() {
  return {
    maps: HLL_MAPS.map(mapPayload),
    currentMapId,
    currentMap: currentMapId ? mapPayload(mapById(currentMapId)) : null,
    markers: currentMapId ? markersByMap[currentMapId] || [] : [],
    rcon: rconStatus,
    live: liveState
  };
}

function setCurrentMap(mapId, source = "rcon") {
  const normalized = normalizeMapId(mapId);
  if (!normalized || !mapById(normalized)) return false;
  if (!markersByMap[normalized]) markersByMap[normalized] = [];
  currentMapId = normalized;
  io.emit("mapChanged", { ...serverState(), source });
  return true;
}

function markerUpdatePayload(data) {
  if (Array.isArray(data)) return { mapId: currentMapId, markers: data };
  return {
    mapId: normalizeMapId(data?.mapId) || currentMapId,
    markers: data?.markers
  };
}

// ============================================================================
// REST API Routes
// ============================================================================

app.get("/api/maps", (req, res) => {
  res.json(HLL_MAPS.map(mapPayload));
});


app.get("/api/server-state", (req, res) => {
  res.json(serverState());
});


app.get("/api/maps/:id/placeholder.svg", (req, res) => {
  const map = mapById(normalizeMapId(req.params.id));
  if (!map) return res.status(404).type("text/plain").send("Unknown map");

  const title = map.name.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  res.type("image/svg+xml").send(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" role="img" aria-label="${title} map placeholder">
  <defs>
    <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
      <path d="M100 0H0V100" fill="none" stroke="#4b5563" stroke-width="2" opacity="0.55"/>
    </pattern>
  </defs>
  <rect width="1000" height="1000" fill="#242424"/>
  <rect width="1000" height="1000" fill="url(#grid)"/>
  <path d="M110 680C210 560 300 610 410 475c130-160 250-105 360-225 55-60 90-78 130-88v730H110Z" fill="#3f4d36" opacity="0.72"/>
  <path d="M0 360c130 44 210 24 318-38 140-80 236-61 350 24 94 70 195 81 332 22v632H0Z" fill="#554f3f" opacity="0.5"/>
  <line x1="500" y1="0" x2="500" y2="1000" stroke="#d6d3c8" stroke-width="3" opacity="0.45"/>
  <line x1="0" y1="500" x2="1000" y2="500" stroke="#d6d3c8" stroke-width="3" opacity="0.45"/>
  <text x="500" y="465" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="52" font-weight="700" fill="#f3f4f6">${title}</text>
  <text x="500" y="532" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="24" fill="#cbd5e1">Drop ${map.image.replace("/maps/", "")} into public/maps to use real artwork</text>
</svg>`);
});

// ============================================================================
// Admin Player Action — proxy to CRCON
// ============================================================================

app.post("/api/admin/player-action", async (req, res) => {
  const { action, player_id, player_name, reason, message, duration_hours } = req.body || {};

  if (!player_id || !action) {
    return res.status(400).json({ ok: false, error: "Missing player_id or action" });
  }

  const baseUrl = process.env.CRCON_URL || process.env.HLL_CRCON_URL;
  if (!baseUrl) {
    return res.status(503).json({ ok: false, error: "CRCON_URL not configured" });
  }

  const by = process.env.CRCON_USERNAME || "TacMap";
  const defaultReason = reason || "Action via tactical map";

  const ACTIONS = {
    message:     { endpoint: "/api/message_player",   body: { player_id, message: message || reason || "Message from tactical map", by, player_name } },
    punish:      { endpoint: "/api/punish",            body: { player_id, reason: defaultReason, by, player_name } },
    kick:        { endpoint: "/api/kick",              body: { player_id, reason: defaultReason, by, player_name } },
    temp_ban:    { endpoint: "/api/temp_ban",          body: { player_id, duration_hours: duration_hours || 1, reason: defaultReason, by, player_name } },
    perma_ban:   { endpoint: "/api/perma_ban",         body: { player_id, reason: defaultReason, by, player_name } },
    switch_team: { endpoint: "/api/switch_player_now", body: { player_id } },
    watch:       { endpoint: "/api/watch_player",      body: { player_id, reason: defaultReason, by, player_name } },
  };

  const spec = ACTIONS[action];
  if (!spec) {
    return res.status(400).json({ ok: false, error: `Unknown action: ${action}` });
  }

  try {
    const data = await requestCrcon(baseUrl, spec.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(spec.body)
    });
    res.json({ ok: true, result: data?.result ?? null });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================================
// CRCON Polling (Live Map Sync)
// ============================================================================

function startCrconPolling() {
  const baseUrl = process.env.CRCON_URL || process.env.HLL_CRCON_URL;

  if (!baseUrl) {
    rconStatus = {
      ...rconStatus,
      error: "Set CRCON_URL in .env to sync the live map"
    };
    return;
  }

  rconStatus = {
    ...rconStatus,
    configured: true
  };

  function emitLiveState() {
    io.emit("liveState", {
      mapId: currentMapId,
      ...liveState
    });
  }

  async function pollCrcon() {
    try {
      const [mapResult, liveResult] = await Promise.all([
        getCrconMap(baseUrl),
        getCrconLiveState(baseUrl)
      ]);

      if (!mapResult.success) {
        throw new Error(mapResult.error || "CRCON map request failed");
      }

      rconStatus = {
        ...rconStatus,
        connected: true,
        error: null,
        lastMapName: mapResult.mapName,
        lastCheckedAt: new Date().toISOString()
      };

      liveState = {
        score: liveResult.score,
        players: liveResult.players,
        playersError: liveResult.playersError,
        playerCounts: liveResult.playerCounts,
        updatedAt: new Date().toISOString()
      };

      const normalized = normalizeMapId(mapResult.mapName);

      if (normalized && normalized !== currentMapId) {
        setCurrentMap(normalized, "rcon");
      }

      emitLiveState();
    } catch (err) {
      rconStatus = {
        ...rconStatus,
        connected: false,
        error: err.message,
        lastCheckedAt: new Date().toISOString()
      };

      io.emit("rconStatus", {
        rcon: rconStatus
      });
    }
  }

  async function pollPlayers() {
    try {
      const { players, playersError } = await getCrconPlayers(baseUrl);
      liveState = {
        ...liveState,
        players,
        playersError,
        updatedAt: new Date().toISOString()
      };
      emitLiveState();
    } catch (err) {
      liveState = {
        ...liveState,
        players: [],
        playersError: err.message,
        updatedAt: new Date().toISOString()
      };
      emitLiveState();
    }
  }

  pollCrcon();
  pollPlayers();

  setInterval(pollCrcon, Number(process.env.CRCON_POLL_MS || 5000));
  setInterval(pollPlayers, Number(process.env.CRCON_PLAYER_POLL_MS || 2000));
}

// ============================================================================
// WebSocket Event Handlers
// ============================================================================

io.on("connection", (socket) => {
  socket.emit("load", serverState());

  socket.on("updateMarkers", (data) => {
    const update = markerUpdatePayload(data);
    if (!update.mapId) return;
    markersByMap[update.mapId] = stripLegacyArrows(update.markers);
    if (update.mapId === currentMapId) {
      io.emit("markersUpdated", serverState());
    }
  });
});

// ============================================================================
// Server Initialization
// ============================================================================

startCrconPolling();

const PORT = Number(process.env.PORT || 5000);
server.listen(PORT, "0.0.0.0", () => {
  console.log(`http://localhost:${PORT}`);
  if (!rconStatus.configured) {
    console.log("CRCON not configured — set CRCON_URL and CRCON_API_TOKEN in .env");
  } else {
    console.log(`CRCON: ${process.env.CRCON_URL || process.env.HLL_CRCON_URL} (map every ${process.env.CRCON_POLL_MS || 5000}ms, players every ${process.env.CRCON_PLAYER_POLL_MS || 2000}ms)`);
  }
  if (process.env.HLL_SERVER_HOST) {
    console.log(`HLL server: ${process.env.HLL_SERVER_HOST}:${process.env.HLL_GAME_PORT || "?"}`);
  }
});
