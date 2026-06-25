import {
  SlashCommandBuilder,
  EmbedBuilder,
  GuildMember,
  type ChatInputCommandInteraction,
} from "discord.js";
import {
  capabilitiesFromRoleNames,
  CAPABILITY_LABELS,
  meaningfulRoleNames,
  type Capability,
} from "./lib/capabilities";

const KHAKI = 0xc8b178;

// --- command definitions (registered with Discord) -------------------------
export const commandData = [
  new SlashCommandBuilder()
    .setName("whoami")
    .setDescription("See what your Discord roles unlock on the website"),
  new SlashCommandBuilder()
    .setName("access")
    .setDescription("Check a member's site access (officers/admins only)")
    .addUserOption((o) =>
      o.setName("user").setDescription("Member to check").setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check the bot is alive"),
].map((c) => c.toJSON());

// --- helpers ---------------------------------------------------------------
function rolesOf(member: GuildMember): string[] {
  return meaningfulRoleNames(member.roles.cache.map((r) => r.name));
}

function capsToLines(caps: Capability[]): string {
  if (caps.length === 0) return "_No site access yet — ask an officer for a role._";
  return caps.map((c) => `• ${CAPABILITY_LABELS[c]}`).join("\n");
}

function accessEmbed(member: GuildMember, siteUrl: string): EmbedBuilder {
  const roles = rolesOf(member);
  const caps = capabilitiesFromRoleNames(roles);
  return new EmbedBuilder()
    .setColor(KHAKI)
    .setTitle(`Site access — ${member.displayName}`)
    .setThumbnail(member.user.displayAvatarURL())
    .addFields(
      { name: "Discord roles", value: roles.length ? roles.join(", ") : "None" },
      { name: "Unlocks on the site", value: capsToLines(caps) },
    )
    .setFooter({ text: `${siteUrl}/members` });
}

// --- handlers --------------------------------------------------------------
export async function handleWhoami(
  interaction: ChatInputCommandInteraction,
  siteUrl: string,
): Promise<void> {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({ content: "Use this inside the server.", ephemeral: true });
    return;
  }
  const member = await interaction.guild.members.fetch(interaction.user.id);
  await interaction.reply({ embeds: [accessEmbed(member, siteUrl)], ephemeral: true });
}

export async function handleAccess(
  interaction: ChatInputCommandInteraction,
  siteUrl: string,
): Promise<void> {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({ content: "Use this inside the server.", ephemeral: true });
    return;
  }
  const caller = await interaction.guild.members.fetch(interaction.user.id);
  const callerCaps = capabilitiesFromRoleNames(rolesOf(caller));
  const allowed =
    callerCaps.includes("manageOps") || callerCaps.includes("admin");
  if (!allowed) {
    await interaction.reply({
      content: "You need an officer or admin role to check other members.",
      ephemeral: true,
    });
    return;
  }

  const target = interaction.options.getUser("user", true);
  const member = await interaction.guild.members.fetch(target.id).catch(() => null);
  if (!member) {
    await interaction.reply({ content: "That user isn't in the server.", ephemeral: true });
    return;
  }
  await interaction.reply({ embeds: [accessEmbed(member, siteUrl)], ephemeral: true });
}

export async function handlePing(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const ws = Math.round(interaction.client.ws.ping);
  await interaction.reply({ content: `Pong — gateway ${ws}ms.`, ephemeral: true });
}
