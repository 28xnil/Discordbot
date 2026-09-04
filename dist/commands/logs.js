import { ChannelType, SlashCommandBuilder } from 'discord.js';
import { getLogChannel, setLogChannel } from '../database.js';
import { createEmbed, colors, errorEmbed } from '../embeds.js';
import { requireStaff } from '../permissions.js';
export const logsCommand = {
    data: new SlashCommandBuilder().setName('logs').setDescription('Configure server event logging.')
        .addSubcommand((command) => command.setName('channel').setDescription('Set the server log channel.')
        .addChannelOption((option) => option.setName('channel').setDescription('Text channel for logs.').addChannelTypes(ChannelType.GuildText).setRequired(true)))
        .addSubcommand((command) => command.setName('status').setDescription('View the configured log channel.')),
    async execute(interaction) {
        if (!(await requireStaff(interaction)) || !interaction.guild)
            return;
        if (interaction.options.getSubcommand() === 'channel') {
            const channel = interaction.options.getChannel('channel', true);
            await setLogChannel(interaction.guild.id, channel.id);
            await interaction.reply({ embeds: [createEmbed('Logging enabled', `Server events will be logged in ${channel}.`, colors.success)], ephemeral: true });
            return;
        }
        const channelId = await getLogChannel(interaction.guild.id);
        await interaction.reply({ embeds: [channelId ? createEmbed('Logging status', `Events are logged in <#${channelId}>.`) : errorEmbed('No server log channel is configured.')], ephemeral: true });
    }
};
