// Registers the bot's slash commands with your guild. Guild commands update
// instantly (global commands can take up to an hour). Run with: npm run register
import { REST, Routes } from "discord.js";
import { config } from "./config";
import { commandData } from "./commands";

const rest = new REST({ version: "10" }).setToken(config.token);

try {
  console.log(`Registering ${commandData.length} commands to guild ${config.guildId}...`);
  await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), {
    body: commandData,
  });
  console.log("Done. Commands are live in your server.");
} catch (err) {
  console.error("Failed to register commands:", err);
  process.exit(1);
}
