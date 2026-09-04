import { REST, Routes } from 'discord.js';
import { commands } from './command-loader.js';
import { config } from './config.js';
import { getCustomCommands, initializeDatabase } from './database.js';
import { SlashCommandBuilder } from 'discord.js';

export async function syncCommands(): Promise<void> {
  await initializeDatabase();
  const rest = new REST({ version: '10' }).setToken(config.token);
  const customCommands = await getCustomCommands();
  const body = [
    ...commands.map((command) => command.data.toJSON()),
    ...customCommands.filter((command) => command.enabled).map((command) => new SlashCommandBuilder().setName(command.name).setDescription(command.description).toJSON())
  ];
  const route = config.guildId
    ? Routes.applicationGuildCommands(config.clientId, config.guildId)
    : Routes.applicationCommands(config.clientId);

  await rest.put(route, { body });
  console.log(config.guildId
    ? `Registered ${body.length} commands in development guild ${config.guildId}.`
    : `Registered ${body.length} global commands.`);
}
