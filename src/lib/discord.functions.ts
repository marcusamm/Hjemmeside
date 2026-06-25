import { createServerFn } from "@tanstack/react-start";

export type GuildStats = {
  memberCount: number | null;
  onlineCount: number | null;
};

// Reads live counts for your Discord server using the bot token.
// Requires the bot to be a member of the server. Logs (server-side) when it
// can't read, so the terminal shows the real reason instead of a silent dash.
export const getGuildStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<GuildStats> => {
    const token = process.env.DISCORD_BOT_TOKEN;
    const guildId = process.env.DISCORD_GUILD_ID;
    if (!token || !guildId) {
      console.warn("[guildStats] Missing DISCORD_BOT_TOKEN or DISCORD_GUILD_ID in .env");
      return { memberCount: null, onlineCount: null };
    }
    try {
      const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}?with_counts=true`, {
        headers: { Authorization: `Bot ${token}` },
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error(
          `[guildStats] Discord API ${res.status} for guild ${guildId}. ` +
            `Is the bot a member of that server? Body: ${body.slice(0, 200)}`,
        );
        return { memberCount: null, onlineCount: null };
      }
      const j = (await res.json()) as {
        approximate_member_count?: number;
        approximate_presence_count?: number;
      };
      return {
        memberCount: j.approximate_member_count ?? null,
        onlineCount: j.approximate_presence_count ?? null,
      };
    } catch (err) {
      console.error("[guildStats] Request failed:", err);
      return { memberCount: null, onlineCount: null };
    }
  },
);
