import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types.js';
import { createEmbed, colors } from '../../embeds.js';

export const pingCommand: Command = {
  data: new SlashCommandBuilder().setName('ping').setDescription('Show bot latency.'),
  async execute(interaction) {
    await interaction.reply({ embeds: [createEmbed('Pong!', `Response time: **${Date.now() - interaction.createdTimestamp}ms**`, colors.success)] });
  }
};
