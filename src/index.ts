import { Client, Events, GatewayIntentBits } from 'discord.js';
import { commandMap } from './command-loader.js';
import { config } from './config.js';
import { ensureGuild, initializeDatabase } from './database.js';
import { helpButtonIds, helpSectionEmbed } from './commands/utility/help.js';
import { handleTicketButton } from './commands/tickets/index.js';
import { handleAutoModMessage } from './automod.js';
import { registerLogging } from './logging.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const startedAt = Date.now();
registerLogging(client);

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Sentinel online as ${readyClient.user.tag} after ${Date.now() - startedAt}ms`);
});

client.on(Events.GuildCreate, (guild) => ensureGuild(guild.id).catch((error) => console.error('Guild setup failed', error)));
client.on(Events.MessageCreate, (message) => handleAutoModMessage(message).catch((error) => console.error('AutoMod failed', error)));
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isButton()) {
      if (helpButtonIds.has(interaction.customId)) {
        await interaction.update({ embeds: [helpSectionEmbed(interaction.customId)], components: interaction.message.components });
      } else if (interaction.customId.startsWith('ticket:')) {
        await handleTicketButton(interaction);
      }
      return;
    }
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId.startsWith('ticket:')) await handleTicketButton(interaction);
      return;
    }
    if (!interaction.isChatInputCommand()) return;
    const command = commandMap.get(interaction.commandName);
    if (command) await command.execute(interaction);
  } catch (error) {
    console.error('Interaction failed', error);
    if (!interaction.isRepliable()) return;
    const response = { content: 'That action failed. Check the bot permissions and try again.', ephemeral: true };
    if (interaction.replied || interaction.deferred) await interaction.followUp(response);
    else await interaction.reply(response);
  }
});

await initializeDatabase();
await client.login(config.token);
