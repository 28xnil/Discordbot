import { pingCommand } from './commands/utility/ping.js';
import { helpCommand } from './commands/utility/help.js';
import { moderationCommands } from './commands/moderation/index.js';
import { ticketCommands } from './commands/tickets/index.js';
import { automodCommand } from './commands/automod.js';
import { logsCommand } from './commands/logs.js';
import { utilityCommands } from './commands/utility/phase5.js';
export const commands = [pingCommand, helpCommand, automodCommand, logsCommand, ...utilityCommands, ...moderationCommands, ...ticketCommands];
export const commandMap = new Map(commands.map((command) => [command.data.name, command]));
