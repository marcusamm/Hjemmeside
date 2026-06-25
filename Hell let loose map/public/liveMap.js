const LIVE_MAP_SIZE = 1000;

let sectorLayer = null;
let playerLayer = null;
let leaderLayer = null;
let mapGeometryCache = null;
let lastSectorKey = "";
let lastPlayerKey = "";
let renderToken = 0;

function initLiveLayer(leafletMap) {
  if (!leafletMap.getPane("livePane")) {
    leafletMap.createPane("livePane");
    leafletMap.getPane("livePane").style.zIndex = 350;
  }
  if (!leafletMap.getPane("liveLeaderPane")) {
    leafletMap.createPane("liveLeaderPane");
    leafletMap.getPane("liveLeaderPane").style.zIndex = 520;
  }

  if (!sectorLayer) {
    sectorLayer = L.layerGroup([], { pane: "livePane" }).addTo(leafletMap);
  }
  if (!playerLayer) {
    playerLayer = L.layerGroup([], { pane: "livePane" }).addTo(leafletMap);
  }
  if (!leaderLayer) {
    leaderLayer = L.layerGroup().addTo(leafletMap);
  }

  return { sectorLayer, playerLayer, leaderLayer };
}

async function loadMapGeometry() {
  if (mapGeometryCache) return mapGeometryCache;

  const res = await fetch("/map-geometry.json?v=4");
  if (!res.ok) return null;

  mapGeometryCache = await res.json();
  return mapGeometryCache;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function worldToLatLng(x, y, geo) {
  const { bounds } = geo;

  // X and Y have independent ranges — do NOT assume square UU bounds.
  // The tac-map image maps world X -> pixel column, world Y -> pixel row.
  // In UE4 (HLL): +X = East (right on horizontal maps), +Y = North (up).
  // Image pixel (0,0) = top-left = (minX, maxY) in world space.
  const nx = clamp01((x - bounds.minX) / (bounds.maxX - bounds.minX));
  const ny = clamp01((y - bounds.minY) / (bounds.maxY - bounds.minY));

  // lat = row from top (0=top, LIVE_MAP_SIZE=bottom): higher Y = further north = higher up = smaller lat
  // lng = column from left: higher X = further east = larger lng
  const lat = (1 - ny) * LIVE_MAP_SIZE;
  const lng = nx * LIVE_MAP_SIZE;

  return L.latLng(lat, lng);
}

// Horizontal map: vertical zone bands along the lng (east-west) axis.
// lngStart/lngEnd are column positions in [0, LIVE_MAP_SIZE].
function addTeamZone(layer, lngStart, lngEnd, color) {
  const zoneStyle = { interactive: false, stroke: false, fillColor: color, fillOpacity: 0.14 };
  const frontStyle = { color, weight: 4, opacity: 0.9, interactive: false };
  L.rectangle([[0, lngStart], [LIVE_MAP_SIZE, lngEnd]], zoneStyle).addTo(layer);
  L.polyline([[0, lngEnd], [LIVE_MAP_SIZE, lngEnd]], frontStyle).addTo(layer);
}

// Vertical map: horizontal zone bands along the lat (north-south) axis.
// In our CRS: lat=0 = south/bottom, lat=LIVE_MAP_SIZE = north/top.
// latStart/latEnd are row positions in [0, LIVE_MAP_SIZE].
function addTeamZoneVertical(layer, latStart, latEnd, color) {
  const zoneStyle = { interactive: false, stroke: false, fillColor: color, fillOpacity: 0.14 };
  const frontStyle = { color, weight: 4, opacity: 0.9, interactive: false };
  L.rectangle([[latStart, 0], [latEnd, LIVE_MAP_SIZE]], zoneStyle).addTo(layer);
  L.polyline([[latEnd, 0], [latEnd, LIVE_MAP_SIZE]], frontStyle).addTo(layer);
}

function addSectorOverlay(layer, geo, score) {
  const allied = Number(score?.allied) || 0;
  const axis = Number(score?.axis) || 0;
  const size = LIVE_MAP_SIZE;
  const mirror = geo.mirror_factions === true;
  const vertical = geo.orientation === "vertical";

  // Sector depth in pixels (5 sectors total, each team controls 0-5)
  const alliedDepth = (allied / 5) * size;
  const axisDepth = (axis / 5) * size;

  const gridStyle = {
    color: "#d6d3c8",
    weight: 2,
    opacity: 0.45,
    interactive: false
  };

  if (vertical) {
    // Front line runs north-south (top-to-bottom).
    // lat=0 = south/bottom, lat=size = north/top.
    // mirror=false: Allied pushes from south (bottom), Axis from north (top).
    // mirror=true:  Axis pushes from south, Allied from north.
    if (mirror) {
      if (axis > 0)   addTeamZoneVertical(layer, 0, axisDepth, "#ef4444");
      if (allied > 0) addTeamZoneVertical(layer, size - alliedDepth, size, "#3b82f6");
    } else {
      if (allied > 0) addTeamZoneVertical(layer, 0, alliedDepth, "#3b82f6");
      if (axis > 0)   addTeamZoneVertical(layer, size - axisDepth, size, "#ef4444");
    }
    // Horizontal sector grid lines (5 rows)
    for (const lat of [0.2, 0.4, 0.6, 0.8].map(f => Math.round(f * size))) {
      L.polyline([[lat, 0], [lat, size]], gridStyle).addTo(layer);
    }
  } else {
    // Front line runs east-west (left-to-right).
    // mirror=true:  Axis starts at left (west), Allied at right.
    // mirror=false: Allied starts at left, Axis at right.
    if (mirror) {
      if (axis > 0)   addTeamZone(layer, 0, axisDepth, "#ef4444");
      if (allied > 0) addTeamZone(layer, size - alliedDepth, size, "#3b82f6");
    } else {
      if (allied > 0) addTeamZone(layer, 0, alliedDepth, "#3b82f6");
      if (axis > 0)   addTeamZone(layer, size - axisDepth, size, "#ef4444");
    }
    // Vertical sector grid lines (5 columns)
    for (const lng of [0.2, 0.4, 0.6, 0.8].map(f => Math.round(f * size))) {
      L.polyline([[0, lng], [size, lng]], gridStyle).addTo(layer);
    }
  }
}

function playerFillColor(team) {
  const t = String(team || "").toLowerCase();
  if (t === "allies" || t.includes("allied") || t.includes("us") || t.includes("brit")) return "#3b82f6";
  if (t === "axis" || t.includes("axis") || t.includes("german") || t.includes("ger")) return "#ef4444";
  return "#9ca3af";
}

const VEHICLE_ICONS = {
  heavy:     "tank-heavy.png",
  medium:    "tank-med.png",
  light:     "tank-light.png",
  recon:     "tank-recon.png",
  jeep:      "truck-jeep.png",
  supply:    "truck-supply.png",
  transport: "truck-transport.png",
};

// Primary: role-based (what CRCON actually exposes reliably)
// Secondary: loadout keyword match (future-proof if CRCON adds vehicle names)
const LOADOUT_PATTERNS = [
  { type: "heavy",     re: /tiger|king.tiger|panther|pershing|m26|kv-?1|is-?1|t-?34-?85/i },
  { type: "medium",    re: /panzer|pzkpfw|sherman|m4a|cromwell|churchill|t-?34(?!.85)|cruiser|matilda/i },
  { type: "light",     re: /stuart|m5|luchs|t-?70|valentine/i },
  { type: "recon",     re: /greyhound|m8|puma|sd.?kfz|armored.car/i },
  { type: "jeep",      re: /jeep|k.?belwagen|kubel|willys/i },
  { type: "supply",    re: /supply/i },
  { type: "transport", re: /transport|lkw|opel|gmc/i },
];

function vehicleIconType(player) {
  const role = String(player.role || "").toLowerCase().replace(/[^a-z]/g, "");
  const loadout = String(player.loadout || "").toLowerCase();

  // Try loadout keyword match first (works if CRCON returns vehicle names)
  for (const { type, re } of LOADOUT_PATTERNS) {
    if (re.test(loadout)) return type;
  }

  // Role-based fallback — only tank commanders get an icon; crew stay as dots
  if (role === "tankcommander") return "light";

  return null;
}

function addPlayers(layer, players, geo) {
  for (const player of players) {
    const latlng = worldToLatLng(player.x, player.y, geo);
    const vType = vehicleIconType(player);
    let marker;

    if (vType) {
      const iconUrl = VEHICLE_ICONS[vType];
      const icon = L.icon({
        iconUrl,
        iconSize:   [22, 22],
        iconAnchor: [11, 11],
        className:  "vehicle-icon"
      });
      marker = L.marker(latlng, { icon, interactive: true, zIndexOffset: 500 });
    } else {
      const fill = playerFillColor(player.team);
      marker = L.circleMarker(latlng, {
        radius: 6,
        color: "#111",
        weight: 1.5,
        fillColor: fill,
        fillOpacity: 1,
        interactive: true
      });
    }

    marker.on("click", (e) => {
      L.DomEvent.stopPropagation(e);
      window.dispatchEvent(new CustomEvent("playerSelect", { detail: player }));
    });

    marker.addTo(layer);
  }
}

function normalizeRole(role) {
  return String(role || "").toLowerCase().replace(/[^a-z]/g, "");
}

function liveLeaderKind(player) {
  const role = normalizeRole(player.role);
  if (!role) return null;

  if (role === "armycommander" || role === "commander") return "commander";
  if (
    role === "officer" ||
    role === "squadleader" ||
    role === "squadlead" ||
    role === "platoonleader" ||
    role === "tankcommander" ||
    role === "crewcommander" ||
    role === "spotter"
  ) {
    return "squadLeader";
  }

  return null;
}

function liveLeaderLabel(player, kind) {
  if (kind === "commander") return "CMD";
  const squad = String(player.squad || "").trim();
  if (squad) return squad;
  return "SL";
}

function liveLeaderColor(player, kind) {
  if (kind === "commander") return "#facc15";

  const team = String(player.team || "").toLowerCase();
  if (team.includes("axis") || team.includes("german")) return "#ef4444";
  if (team.includes("allied") || team.includes("ally") || team.includes("us") || team.includes("brit")) {
    return "#3b82f6";
  }
  return "#22c55e";
}

function createLiveLeaderMarker(latlng, player, kind) {
  const label = liveLeaderLabel(player, kind);
  const color = liveLeaderColor(player, kind);
  const role = player.role ? ` - ${player.role}` : "";

  // Simple floating text label — no icon, no nametag box.
  // iconSize 72×14, anchor at (36, 22) centres the text horizontally
  // and places its bottom ~8 px above the player dot centre.
  const icon = L.divIcon({
    className: "live-float-wrap",
    html: `<span class="live-float-label" style="color:${color}">${label}</span>`,
    iconSize: [72, 14],
    iconAnchor: [36, 22]
  });

  return L.marker(latlng, {
    icon,
    interactive: false,
    keyboard: false,
    pane: "liveLeaderPane",
    title: `${label}: ${player.name || "Leader"}${role}`,
    zIndexOffset: kind === "commander" ? 1200 : 1000
  });
}

function addLeaderMarkers(layer, players, geo) {
  for (const player of players) {
    const kind = liveLeaderKind(player);
    if (!kind) continue;

    const latlng = worldToLatLng(player.x, player.y, geo);
    createLiveLeaderMarker(latlng, player, kind).addTo(layer);
  }
}

function sectorKey(mapId, live) {
  return JSON.stringify({ mapId, score: live?.score });
}

function playerKey(live) {
  return JSON.stringify({
    updatedAt: live?.updatedAt || null,
    error: live?.playersError || null,
    players: (live?.players || []).map((p) => [
      p.id,
      p.role,
      p.team,
      p.squad,
      p.loadout || null,
      Math.round(p.x / 100),
      Math.round(p.y / 100)
    ])
  });
}

async function renderLiveState(mapId, live, leafletMap) {
  initLiveLayer(leafletMap);

  if (!mapId || !live) return;

  const token = ++renderToken;
  const geometry = await loadMapGeometry();
  if (token !== renderToken) return;

  const geo = geometry?.maps?.[mapId];
  if (!geo) return;

  const nextSectorKey = sectorKey(mapId, live);
  if (nextSectorKey !== lastSectorKey) {
    sectorLayer.clearLayers();
    addSectorOverlay(sectorLayer, geo, live.score);
    lastSectorKey = nextSectorKey;
  }

  const nextPlayerKey = playerKey(live);
  if (nextPlayerKey === lastPlayerKey) return;

  lastPlayerKey = nextPlayerKey;
  playerLayer.clearLayers();
  leaderLayer.clearLayers();

  if (live.playersError || !live.players?.length) return;

  addPlayers(playerLayer, live.players, geo);
  addLeaderMarkers(leaderLayer, live.players, geo);
}

function clearLiveLayer() {
  renderToken += 1;
  lastSectorKey = "";
  lastPlayerKey = "";
  sectorLayer?.clearLayers();
  playerLayer?.clearLayers();
  leaderLayer?.clearLayers();
}
