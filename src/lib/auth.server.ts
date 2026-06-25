// ---------------------------------------------------------------------------
// SERVER-ONLY auth helpers. NEVER import this from a client component.
// It is only imported by server functions and server-route handlers, and it
// reads secrets (Discord client secret, bot token, session password) from env.
// ---------------------------------------------------------------------------
import {
  // aliased so the react-hooks lint rule doesn't mistake it for a React hook
  useSession as openSession,
  getRequestUrl,
  getRequestProtocol,
} from "@tanstack/react-start/server";
import { capabilitiesFromRoleNames, type SessionUser } from "./auth-config";

const DISCORD_API = "https://discord.com/api/v10";
const CDN = "https://cdn.discordapp.com";

// --- env -------------------------------------------------------------------
type ProcessLike = { env?: Record<string, string | undefined> };

function env(key: string): string | undefined {
  const proc = (globalThis as unknown as { process?: ProcessLike }).process;
  const v = proc?.env ? proc.env[key] : undefined;
  return v && v.length > 0 ? v : undefined;
}

function requireEnv(key: string): string {
  const v = env(key);
  if (!v) {
    throw new Error(`Missing required environment variable: ${key}. See DISCORD_SETUP.md.`);
  }
  return v;
}

export function discordClientId(): string {
  return requireEnv("DISCORD_CLIENT_ID");
}

// --- session ---------------------------------------------------------------
export type SessionData = { user?: SessionUser };

export function getSessionConfig() {
  const password = requireEnv("DISCORD_SESSION_SECRET");
  if (password.length < 32) {
    throw new Error("DISCORD_SESSION_SECRET must be at least 32 characters long.");
  }
  let secure = true;
  try {
    secure = getRequestProtocol() === "https";
  } catch {
    secure = true;
  }
  return {
    password,
    name: "objfirst_session",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    cookie: {
      sameSite: "lax" as const,
      httpOnly: true,
      secure,
      path: "/",
    },
  };
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const session = await openSession<SessionData>(getSessionConfig());
    return session.data.user ?? null;
  } catch {
    return null;
  }
}

export async function setSessionUser(user: SessionUser): Promise<void> {
  const session = await openSession<SessionData>(getSessionConfig());
  await session.update({ user });
}

export async function clearSessionUser(): Promise<void> {
  const session = await openSession<SessionData>(getSessionConfig());
  await session.clear();
}

// --- OAuth + redirect URI --------------------------------------------------
export function getRedirectUri(): string {
  const override = env("DISCORD_REDIRECT_URI");
  if (override) return override;
  const origin = getRequestUrl().origin;
  return `${origin}/auth/discord/callback`;
}

export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: discordClientId(),
    redirect_uri: getRedirectUri(),
    response_type: "code",
    // `identify` = read the user's id/name/avatar. Roles are read separately
    // via the bot token, so no extra scope is needed.
    scope: "identify",
    state,
    prompt: "consent",
  });
  return `${DISCORD_API}/oauth2/authorize?${params.toString()}`;
}

type TokenResponse = { access_token: string; token_type: string };

export async function exchangeCodeForToken(code: string): Promise<string> {
  const body = new URLSearchParams({
    client_id: discordClientId(),
    client_secret: requireEnv("DISCORD_CLIENT_SECRET"),
    grant_type: "authorization_code",
    code,
    redirect_uri: getRedirectUri(),
  });
  const res = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`Discord token exchange failed (${res.status})`);
  }
  const json = (await res.json()) as TokenResponse;
  return json.access_token;
}

// --- Discord identity (user access token) ----------------------------------
type DiscordIdentity = {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
};

export async function fetchIdentity(accessToken: string): Promise<DiscordIdentity> {
  const res = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch Discord user (${res.status})`);
  return (await res.json()) as DiscordIdentity;
}

// --- Guild member + roles (bot token) --------------------------------------
type GuildMember = { roles: string[]; nick: string | null } | null;

export async function fetchGuildMember(userId: string): Promise<GuildMember> {
  const guildId = requireEnv("DISCORD_GUILD_ID");
  const botToken = requireEnv("DISCORD_BOT_TOKEN");
  const res = await fetch(`${DISCORD_API}/guilds/${guildId}/members/${userId}`, {
    headers: { Authorization: `Bot ${botToken}` },
  });
  if (res.status === 404) return null; // user is not in the server
  if (!res.ok) throw new Error(`Failed to fetch guild member (${res.status})`);
  const json = (await res.json()) as { roles?: string[]; nick?: string | null };
  return { roles: json.roles ?? [], nick: json.nick ?? null };
}

// Cache the guild's role-id -> role-name map for a few minutes.
let rolesCache: { at: number; map: Map<string, string> } | null = null;
const ROLES_TTL_MS = 5 * 60 * 1000;

async function fetchGuildRoleMap(): Promise<Map<string, string>> {
  if (rolesCache && Date.now() - rolesCache.at < ROLES_TTL_MS) {
    return rolesCache.map;
  }
  const guildId = requireEnv("DISCORD_GUILD_ID");
  const botToken = requireEnv("DISCORD_BOT_TOKEN");
  const res = await fetch(`${DISCORD_API}/guilds/${guildId}/roles`, {
    headers: { Authorization: `Bot ${botToken}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch guild roles (${res.status})`);
  const json = (await res.json()) as { id: string; name: string }[];
  const map = new Map(json.map((r) => [r.id, r.name]));
  rolesCache = { at: Date.now(), map };
  return map;
}

// --- Build the session user ------------------------------------------------
export async function buildSessionUser(accessToken: string): Promise<SessionUser> {
  const identity = await fetchIdentity(accessToken);
  const member = await fetchGuildMember(identity.id);

  const roleIds: string[] = member ? member.roles : [];
  const roleNames: string[] = [];
  if (member) {
    const roleMap = await fetchGuildRoleMap();
    for (const id of roleIds) {
      const name = roleMap.get(id);
      if (name) roleNames.push(name);
    }
  }

  const displayName = member?.nick || identity.global_name || identity.username;
  const avatarUrl = identity.avatar
    ? `${CDN}/avatars/${identity.id}/${identity.avatar}.png?size=128`
    : null;

  return {
    id: identity.id,
    username: displayName,
    avatarUrl,
    roleIds,
    roleNames,
    capabilities: capabilitiesFromRoleNames(roleNames),
    isMember: member !== null,
  };
}
