import { REST, Routes } from 'discord.js';
import { commands } from './command-loader.js';
import { config } from './config.js';
export async function syncCommands() {
    const rest = new REST({ version: '10' }).setToken(config.token);
    const body = commands.map((command) => command.data.toJSON());
    const route = config.guildId
        ? Routes.applicationGuildCommands(config.clientId, config.guildId)
        : Routes.applicationCommands(config.clientId);
    await rest.put(route, { body });
    console.log(config.guildId
        ? `Registered ${body.length} commands in development guild ${config.guildId}.`
        : `Registered ${body.length} global commands.`);
}
