import "dotenv/config";

function need(key: string): string {
  const v = process.env[key];
  if (!v || v.length === 0) {
    throw new Error(`Missing required env var: ${key}. See bot/.env.example`);
  }
  return v;
}

function optional(key: string): string | null {
  const v = process.env[key];
  return v && v.length > 0 ? v : null;
}

export const config = {
  token: need("DISCORD_BOT_TOKEN"),
  clientId: need("DISCORD_CLIENT_ID"),
  guildId: need("DISCORD_GUILD_ID"),
  welcomeChannelId: optional("WELCOME_CHANNEL_ID"),
  logChannelId: optional("LOG_CHANNEL_ID"),
  siteUrl: optional("SITE_URL") ?? "http://localhost:3000",
};
