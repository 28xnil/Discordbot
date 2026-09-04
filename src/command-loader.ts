import type { Command } from './types.js';
import { pingCommand } from './commands/utility/ping.js';
import { helpCommand } from './commands/utility/help.js';
import { moderationCommands } from './commands/moderation/index.js';
import { ticketCommands } from './commands/tickets/index.js';
import { automodCommand } from './commands/automod.js';
import { logsCommand } from './commands/logs.js';
import { utilityCommands } from './commands/utility/phase5.js';
import { configCommand, roleCommands } from './commands/management.js';

export const commands: Command[] = [pingCommand, helpCommand, automodCommand, logsCommand, configCommand, ...roleCommands, ...utilityCommands, ...moderationCommands, ...ticketCommands];
export const commandMap = new Map(commands.map((command) => [command.data.name, command]));
