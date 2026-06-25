// ---------------------------------------------------------------------------
// SERVER-ONLY. Reads the Discord channel where members post their Steam64 ID
// and builds a map of Discord user id -> Steam64 id, using the bot token.
// Requires STEAM_LINK_CHANNEL_ID in .env, the bot to have access to that
// channel, and the Message Content Intent enabled on the bot.
// ---------------------------------------------------------------------------
const DISCORD_API = "https://discord.com/api/v10";
const STEAM64 = /\b(7656\d{13})\b/; // 17-digit Steam64 id

function env(key: string): string | undefined {
  const proc = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } })
    .process;
  const v = proc?.env?.[key];
  return v && v.length > 0 ? v : undefined;
}

type DiscordMessage = {
  id: string;
  content: string;
  author?: { id?: string };
};

let cache: { at: number; map: Map<string, string> } | null = null;
const TTL_MS = 10 * 60 * 1000;

async function buildMap(): Promise<Map<string, string>> {
  const token = env("DISCORD_BOT_TOKEN");
  const channel = env("STEAM_LINK_CHANNEL_ID");
  const map = new Map<string, string>();
  if (!token || !channel) {
    console.warn("[steam-link] Missing DISCORD_BOT_TOKEN or STEAM_LINK_CHANNEL_ID in .env");
    return map;
  }

  let before: string | undefined;
  // Scan up to 5 pages (500 messages), newest first; newest message per user wins.
  for (let page = 0; page < 5; page++) {
    const url =
      `${DISCORD_API}/channels/${channel}/messages?limit=100` + (before ? `&before=${before}` : "");
    let res: Response;
    try {
      res = await fetch(url, { headers: { Authorization: `Bot ${token}` } });
    } catch (err) {
      console.error("[steam-link] request failed:", err);
      break;
    }
    if (!res.ok) {
      console.error(
        `[steam-link] channel read HTTP ${res.status} — is the bot in that channel, and is the ` +
          `Message Content Intent enabled?`,
      );
      break;
    }
    const messages = (await res.json().catch(() => [])) as DiscordMessage[];
    if (!Array.isArray(messages) || messages.length === 0) break;

    for (const m of messages) {
      const authorId = m.author?.id;
      if (!authorId || map.has(authorId)) continue; // newest wins (we go newest->oldest)
      const match = (m.content || "").match(STEAM64);
      if (match) map.set(authorId, match[1]);
    }
    before = messages[messages.length - 1]?.id;
    if (messages.length < 100) break;
  }
  return map;
}

export async function getSteamIdForDiscordUser(discordUserId: string): Promise<string | null> {
  if (!cache || Date.now() - cache.at >= TTL_MS) {
    cache = { at: Date.now(), map: await buildMap() };
  }
  return cache.map.get(discordUserId) ?? null;
}
