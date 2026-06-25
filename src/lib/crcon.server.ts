// ---------------------------------------------------------------------------
// SERVER-ONLY. Talks to your Hell Let Loose CRCON to build a per-player
// leaderboard from the last N games. Credentials live in .env and never reach
// the browser. A human-readable diagnostic is returned so the stats page can
// show exactly what happened (login, endpoints, field names) without needing
// the terminal.
// ---------------------------------------------------------------------------
import type { PlayerRow, Leaderboard } from "./stats-types";

function env(key: string): string | undefined {
  const proc = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } })
    .process;
  const v = proc?.env?.[key];
  return v && v.length > 0 ? v : undefined;
}

function baseUrl(): string | null {
  const u = env("CRCON_URL");
  return u ? u.replace(/\/+$/, "") : null;
}

let diag: string[] = [];
const note = () => diag.join("  ·  ");

// --- session handling ------------------------------------------------------
let sessionCookie: string | null = null;

async function login(): Promise<boolean> {
  const base = baseUrl();
  const user = env("CRCON_USER");
  const pass = env("CRCON_PASSWORD");
  if (!base || !user || !pass) {
    diag.push("missing CRCON_URL/USER/PASSWORD in .env");
    return false;
  }
  try {
    const res = await fetch(`${base}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: user, password: pass }),
    });
    if (!res.ok) {
      diag.push(`login HTTP ${res.status}`);
      return false;
    }
    const headers = res.headers as Headers & { getSetCookie?: () => string[] };
    const setCookies =
      typeof headers.getSetCookie === "function"
        ? headers.getSetCookie()
        : res.headers.get("set-cookie")
          ? [res.headers.get("set-cookie") as string]
          : [];
    const sess = setCookies.find((c) => c.startsWith("sessionid="));
    if (!sess) {
      diag.push("login ok but no sessionid cookie");
      return false;
    }
    sessionCookie = sess.split(";")[0];
    diag.push("login ok");
    return true;
  } catch (err) {
    diag.push(`login error: ${(err as Error).message}`);
    return false;
  }
}

async function apiGet(path: string): Promise<unknown | null> {
  const base = baseUrl();
  if (!base) return null;
  if (!sessionCookie && !(await login())) return null;

  const doFetch = () =>
    fetch(`${base}${path}`, {
      headers: { Cookie: sessionCookie as string, Accept: "application/json" },
    });

  let res = await doFetch().catch((e) => {
    diag.push(`GET ${path} error: ${(e as Error).message}`);
    return null;
  });
  if (!res) return null;

  if (res.status === 401 || res.status === 403) {
    sessionCookie = null;
    if (!(await login())) return null;
    res = await doFetch().catch(() => null);
    if (!res) return null;
  }
  if (!res.ok) {
    diag.push(`GET ${path.split("?")[0]} HTTP ${res.status}`);
    return null;
  }
  try {
    const json = (await res.json()) as { result?: unknown; failed?: boolean; error?: unknown };
    if (json && typeof json === "object" && "result" in json) {
      if (json.failed) diag.push(`${path.split("?")[0]} failed: ${String(json.error)}`);
      return json.result ?? null;
    }
    return json;
  } catch {
    diag.push(`${path.split("?")[0]} returned non-JSON`);
    return null;
  }
}

// --- tolerant field helpers ------------------------------------------------
function pickNum(o: Record<string, unknown>, keys: string[]): number {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "number") return v;
    if (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v))) return Number(v);
  }
  return 0;
}
function pickStr(o: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.length > 0) return v;
    if (typeof v === "number") return String(v);
  }
  return "";
}
function asArray(x: unknown, ...keys: string[]): Record<string, unknown>[] {
  if (Array.isArray(x)) return x as Record<string, unknown>[];
  if (x && typeof x === "object") {
    const obj = x as Record<string, unknown>;
    for (const k of keys) if (Array.isArray(obj[k])) return obj[k] as Record<string, unknown>[];
  }
  return [];
}

async function getRecentMapIds(limit: number): Promise<number[]> {
  const result = await apiGet(`/api/get_scoreboard_maps?limit=${limit}`);
  if (result == null) return [];
  const maps = asArray(result, "maps", "scoreboard_maps");
  diag.push(`get_scoreboard_maps: ${maps.length} games`);
  if (maps[0]) diag.push(`map keys: ${Object.keys(maps[0]).slice(0, 12).join(",")}`);
  return maps
    .map((m) => pickNum(m, ["id", "map_id"]))
    .filter((id) => id > 0)
    .slice(0, limit);
}

let loggedPlayerKeys = false;
async function getMapPlayers(mapId: number): Promise<Record<string, unknown>[]> {
  const result = await apiGet(`/api/get_map_scoreboard?map_id=${mapId}`);
  if (result == null) return [];
  const players = asArray(result, "player_stats", "players", "stats");
  if (!loggedPlayerKeys && players[0]) {
    diag.push(`player keys: ${Object.keys(players[0]).slice(0, 14).join(",")}`);
    loggedPlayerKeys = true;
  }
  return players;
}

// 15-minute in-memory cache of the FULL per-player aggregation (nothing on disk).
let cache: { at: number; all: PlayerRow[]; gamesAnalyzed: number; note: string } | null = null;
const TTL_MS = 15 * 60 * 1000;

async function aggregate(
  games: number,
): Promise<{ all: PlayerRow[]; gamesAnalyzed: number; note: string }> {
  if (cache && Date.now() - cache.at < TTL_MS) {
    return { all: cache.all, gamesAnalyzed: cache.gamesAnalyzed, note: cache.note };
  }
  diag = [];
  loggedPlayerKeys = false;

  const mapIds = await getRecentMapIds(games);
  if (mapIds.length === 0) {
    const out = { all: [] as PlayerRow[], gamesAnalyzed: 0, note: note() };
    cache = { at: Date.now(), ...out };
    return out;
  }

  type Acc = {
    name: string;
    games: number;
    kills: number;
    deaths: number;
    combat: number;
    offense: number;
    defense: number;
    support: number;
    seconds: number;
  };
  const acc = new Map<string, Acc>();
  const perMap = await Promise.all(mapIds.map((id) => getMapPlayers(id)));
  for (const players of perMap) {
    for (const p of players) {
      const id = pickStr(p, ["player_id", "steam_id_64", "playerId", "id"]);
      if (!id) continue;
      const a = acc.get(id) ?? {
        name: "",
        games: 0,
        kills: 0,
        deaths: 0,
        combat: 0,
        offense: 0,
        defense: 0,
        support: 0,
        seconds: 0,
      };
      a.name = pickStr(p, ["player", "name", "player_name"]) || a.name || id;
      a.games += 1;
      a.kills += pickNum(p, ["kills"]);
      a.deaths += pickNum(p, ["deaths"]);
      a.combat += pickNum(p, ["combat", "combat_score"]);
      a.offense += pickNum(p, ["offense", "offense_score"]);
      a.defense += pickNum(p, ["defense", "defense_score"]);
      a.support += pickNum(p, ["support", "support_score"]);
      a.seconds += pickNum(p, ["time_seconds", "playtime", "time", "playtime_seconds"]);
      acc.set(id, a);
    }
  }

  const all: PlayerRow[] = [...acc.entries()]
    .map(([playerId, a]) => ({
      playerId,
      name: a.name,
      games: a.games,
      avgKills: a.kills / a.games,
      avgDeaths: a.deaths / a.games,
      kd: a.deaths > 0 ? a.kills / a.deaths : a.kills,
      avgCombat: a.combat / a.games,
      avgOffense: a.offense / a.games,
      avgDefense: a.defense / a.games,
      avgSupport: a.support / a.games,
      hours: a.seconds / 3600,
    }))
    .sort((x, y) => y.avgKills - x.avgKills);

  diag.push(`${acc.size} players aggregated`);
  const out = { all, gamesAnalyzed: mapIds.length, note: note() };
  cache = { at: Date.now(), ...out };
  return out;
}

export async function buildLeaderboard(games = 30, topN = 25): Promise<Leaderboard> {
  const { all, gamesAnalyzed, note: n } = await aggregate(games);
  return {
    players: all.slice(0, topN),
    gamesAnalyzed,
    updatedAt: new Date().toISOString(),
    note: n,
  };
}

export async function getPlayerStats(steamId: string, games = 30): Promise<PlayerRow | null> {
  const { all } = await aggregate(games);
  return all.find((p) => p.playerId === steamId) ?? null;
}

// --- live server status (CRCON public info) --------------------------------
import type { ServerStatus } from "./stats-types";

function asObj(x: unknown): Record<string, unknown> {
  return x && typeof x === "object" ? (x as Record<string, unknown>) : {};
}
function asNum(x: unknown): number | null {
  if (typeof x === "number") return x;
  if (typeof x === "string" && x.trim() !== "" && !isNaN(Number(x))) return Number(x);
  return null;
}
function asStr(x: unknown): string | null {
  if (typeof x === "string" && x.length > 0) return x;
  if (typeof x === "number") return String(x);
  return null;
}

export async function getServerStatus(): Promise<ServerStatus | null> {
  const result = await apiGet("/api/get_public_info");
  if (result == null) return null;
  const r = asObj(result);
  const teams = asObj(r.player_count_by_team);
  const players =
    asNum(r.player_count) ??
    asNum(r.current_players) ??
    (asNum(teams.allied) ?? 0) + (asNum(teams.axis) ?? 0);
  const maxPlayers = asNum(r.max_player_count) ?? asNum(r.max_players) ?? 100;
  const cm = asObj(r.current_map);
  const cmMap = asObj(cm.map);
  const map =
    asStr(cm.pretty_name) ??
    asStr(cmMap.pretty_name) ??
    asStr(cmMap.name) ??
    asStr(cm.name) ??
    asStr(r.current_map) ??
    "Unknown";
  const nm = asObj(r.name);
  const name = asStr(nm.name) ?? asStr(nm.short_name) ?? asStr(r.name) ?? "Objective First";
  return { name, players, maxPlayers, map, online: true };
}
