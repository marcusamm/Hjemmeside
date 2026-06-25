let sessionCookie = null;
let csrfToken = null;
let loginPromise = null;

function useTokenAuth() {
  const hasToken = !!(process.env.CRCON_API_TOKEN && process.env.CRCON_API_TOKEN.trim());
  const hasCredentials = !!(process.env.CRCON_USERNAME && process.env.CRCON_PASSWORD);
  // Prefer session/cookie auth when credentials are available — it works reliably across all CRCON endpoints.
  // Fall back to token only when no username/password are set.
  return hasToken && !hasCredentials;
}

function extractSetCookies(res) {
  const all = typeof res.headers.getSetCookie === "function"
    ? res.headers.getSetCookie()
    : (res.headers.get("set-cookie") || "").split(/,(?=\s*\w+=)/);

  let session = null;
  let csrf = null;
  for (const part of all) {
    const kv = part.split(";")[0].trim();
    if (kv.startsWith("sessionid=")) session = kv.slice("sessionid=".length);
    if (kv.startsWith("csrftoken=")) csrf = kv.slice("csrftoken=".length);
  }
  return { session, csrf };
}

function cookieHeader() {
  const parts = [];
  if (sessionCookie) parts.push(`sessionid=${sessionCookie}`);
  if (csrfToken) parts.push(`csrftoken=${csrfToken}`);
  return parts.join("; ");
}

async function login(baseUrl) {
  const username = process.env.CRCON_USERNAME;
  const password = process.env.CRCON_PASSWORD;
  if (!username || !password) {
    throw new Error(
      "CRCON credentials missing — set CRCON_API_TOKEN (recommended) or CRCON_USERNAME + CRCON_PASSWORD in .env"
    );
  }

  const url = `${baseUrl.replace(/\/$/, "")}/api/login`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ username, password }),
    redirect: "follow"
  });

  const { session, csrf } = extractSetCookies(res);

  if (session) sessionCookie = session;
  if (csrf) csrfToken = csrf;

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`CRCON login failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = await res.json().catch(() => null);
  if (data?.failed) {
    throw new Error(data.error || "CRCON login rejected");
  }
}

async function ensureLoggedIn(baseUrl) {
  if (useTokenAuth()) return;
  if (sessionCookie) return;
  if (loginPromise) return loginPromise;
  loginPromise = login(baseUrl).finally(() => { loginPromise = null; });
  return loginPromise;
}

async function readJsonResponse(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { result: text.trim() };
  }
}

async function requestCrcon(baseUrl, path, options = {}, retried = false) {
  await ensureLoggedIn(baseUrl);

  const url = `${baseUrl.replace(/\/$/, "")}${path}`;

  let authHeaders = {};
  if (useTokenAuth()) {
    authHeaders = { Authorization: `Token ${process.env.CRCON_API_TOKEN.trim()}` };
  } else {
    authHeaders = {
      Cookie: cookieHeader(),
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {})
    };
  }

  const headers = {
    Accept: "application/json",
    ...authHeaders,
    ...(options.headers || {})
  };

  const res = await fetch(url, { ...options, headers });

  if ((res.status === 401 || res.status === 403) && !retried) {
    if (useTokenAuth()) {
      throw new Error(
        `CRCON rejected the API token (${res.status}). Make sure your Django API key has "Can see detailed players" permission enabled in CRCON admin.`
      );
    }
    sessionCookie = null;
    csrfToken = null;
    await login(baseUrl);
    return requestCrcon(baseUrl, path, options, true);
  }

  if (!res.ok) {
    throw new Error(`CRCON ${path} failed (${res.status})`);
  }

  const data = await readJsonResponse(res);
  if (data?.failed) {
    throw new Error(data.error || `CRCON ${path} failed`);
  }

  return data;
}

function extractMapName(payload) {
  if (!payload) return null;

  let name = null;
  if (typeof payload === "string") {
    name = payload;
  } else if (payload.current_map) {
    const current = payload.current_map;
    if (typeof current === "string") {
      name = current;
    } else if (current.map != null) {
      const map = current.map;
      if (typeof map === "string") {
        name = map;
      } else {
        name = map.id || map.name || map.layer_name || map.map?.id || null;
      }
    }
  } else if (payload.map != null) {
    const map = payload.map;
    name = typeof map === "string" ? map : map.id || map.name || null;
  }

  if (!name) return null;
  name = String(name).trim();
  if (!name || /^untitled_/i.test(name)) return null;
  return name.replace(/_RESTART$/i, "");
}

async function getCrconMap(baseUrl) {
  const attempts = [
    () => requestCrcon(baseUrl, "/api/get_public_info"),
    () =>
      requestCrcon(baseUrl, "/api/get_gamestate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}"
      }),
    () => requestCrcon(baseUrl, "/api/get_map")
  ];

  let lastError = "Could not read map from CRCON";

  for (const attempt of attempts) {
    try {
      const data = await attempt();
      const mapName = extractMapName(data?.result ?? data);
      if (mapName) {
        return { success: true, mapName };
      }
      lastError = "CRCON response did not include a map name";
    } catch (err) {
      lastError = err.message;
    }
  }

  return { success: false, error: lastError };
}

function playerListFromResult(result) {
  if (!result) return [];
  if (Array.isArray(result)) return result;
  if (Array.isArray(result.players)) return result.players;
  if (result.players && typeof result.players === "object") {
    return Object.values(result.players);
  }
  return [];
}

function parsePlayerEntry(player) {
  const pos = player.world_position || player.worldPosition || {};
  const x = Number(pos.x);
  const y = Number(pos.y);
  const z = Number(pos.z);

  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (x === 0 && y === 0 && z === 0) return null;

  const name = player.name || "";
  if (!name) return null;

  return {
    id: player.player_id || player.iD || player.id,
    name,
    team: player.team || null,
    role: player.role || null,
    squad: player.unit_name || player.platoon || null,
    x,
    y,
    z: Number.isFinite(z) ? z : 0,
    kills:   Number(player.kills)   || 0,
    deaths:  Number(player.deaths)  || 0,
    combat:  Number(player.combat)  || 0,
    offense: Number(player.offense) || 0,
    defense: Number(player.defense) || 0,
    support: Number(player.support) || 0,
    loadout: player.loadout || player.weapon || null
  };
}

function parsePlayers(result) {
  return playerListFromResult(result)
    .map(parsePlayerEntry)
    .filter(Boolean);
}

async function getCrconPlayers(baseUrl) {
  try {
    const detailed = await requestCrcon(baseUrl, "/api/get_detailed_players");
    const players = parsePlayers(detailed?.result);
    return { players, playersError: null };
  } catch (err) {
    return { players: [], playersError: err.message };
  }
}

async function getCrconLiveState(baseUrl) {
  const data = await requestCrcon(baseUrl, "/api/get_public_info");
  const result = data?.result || {};
  const score = result.score || { allied: 0, axis: 0 };
  const { players, playersError } = await getCrconPlayers(baseUrl);

  return {
    success: true,
    score,
    players,
    playersError,
    playerCounts: result.player_count_by_team || null
  };
}

module.exports = {
  getCrconMap,
  getCrconLiveState,
  getCrconPlayers,
  extractMapName,
  requestCrcon
};
