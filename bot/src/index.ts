import {
  Client,
  GatewayIntentBits,
  Events,
  type GuildMember,
  type PartialGuildMember,
} from "discord.js";
import { config } from "./config";
import { handleWhoami, handleAccess, handlePing } from "./commands";
import { capabilitiesFromRoleNames, meaningfulRoleNames } from "./lib/capabilities";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    // Privileged — enable "Server Members Intent" in the Developer Portal.
    GatewayIntentBits.GuildMembers,
  ],
});

client.once(Events.ClientReady, (c) => {
  console.log(`Logged in as ${c.user.tag}. Serving guild ${config.guildId}.`);
});

// --- slash command dispatch ------------------------------------------------
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  try {
    switch (interaction.commandName) {
      case "whoami":
        await handleWhoami(interaction, config.siteUrl);
        break;
      case "access":
        await handleAccess(interaction, config.siteUrl);
        break;
      case "ping":
        await handlePing(interaction);
        break;
    }
  } catch (err) {
    console.error(`Error handling /${interaction.commandName}:`, err);
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction
        .reply({ content: "Something went wrong.", ephemeral: true })
        .catch(() => {});
    }
  }
});

// --- member sync: welcome new members --------------------------------------
client.on(Events.GuildMemberAdd, async (member) => {
  if (!config.welcomeChannelId) return;
  const channel = await member.guild.channels
    .fetch(config.welcomeChannelId)
    .catch(() => null);
  if (channel && channel.isTextBased() && "send" in channel) {
    await channel
      .send(
        `Welcome to the front, ${member}. Sign in at ${config.siteUrl}/login to unlock the members area once you've been given a role.`,
      )
      .catch((e) => console.error("welcome send failed:", e));
  }
});

// --- member sync: log when a member's SITE ACCESS changes ------------------
client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  if (!config.logChannelId) return;

  const oldCaps = capabilitiesFromRoleNames(
    meaningfulRoleNames(roleNames(oldMember)),
  ).sort();
  const newCaps = capabilitiesFromRoleNames(
    meaningfulRoleNames(roleNames(newMember)),
  ).sort();

  // Only announce when the resulting site access actually changed.
  if (oldCaps.join(",") === newCaps.join(",")) return;

  const channel = await newMember.guild.channels
    .fetch(config.logChannelId)
    .catch(() => null);
  if (channel && channel.isTextBased() && "send" in channel) {
    const now = newCaps.length ? newCaps.join(", ") : "none";
    const before = oldCaps.length ? oldCaps.join(", ") : "none";
    await channel
      .send(
        `🔄 Site access changed for **${newMember.user.tag}** — now: ${now} (was: ${before}).`,
      )
      .catch((e) => console.error("log send failed:", e));
  }
});

function roleNames(member: GuildMember | PartialGuildMember): string[] {
  return member.roles.cache.map((r) => r.name);
}

client.login(config.token);
