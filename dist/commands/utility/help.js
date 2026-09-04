import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } from 'discord.js';
import { createEmbed, colors } from '../../embeds.js';
export const helpButtonIds = new Set(['help:moderation', 'help:tickets', 'help:management', 'help:utility']);
const sections = {
    'help:moderation': { title: 'Moderation', description: 'Staff tools for keeping your server safe and accountable.', commands: '`/warn`, `/warnings`, `/clearwarnings`, `/unwarn`, `/timeout`, `/untimeout`, `/kick`, `/ban`, `/unban`, `/cases`, `/case`, `/automod`' },
    'help:tickets': { title: 'Tickets', description: 'Private support channels with staff assignment and topic selection.', commands: '`/ticket panel`, `/ticket create`, `/ticket config`, `/ticket close`, `/ticket reopen`, `/ticket delete`, `/ticket rename`, `/ticket claim`, `/ticket unclaim`, `/ticket list`' },
    'help:management': { title: 'Management', description: 'Server configuration, logging, roles, welcome messages, and permission controls.', commands: 'Coming next: `/config`, `/logs`, `/welcome`, `/goodbye`, `/role`, and automated roles.' },
    'help:utility': { title: 'Utility', description: 'Useful information and everyday server tools.', commands: '`/ping`, `/help`, `/botinfo`, `/serverinfo`, `/userinfo`, `/avatar`, `/banner`, `/roleinfo`, `/channelinfo`, `/permissions`, `/membercount`, `/choose`, `/roll`, `/poll`, `/remind`' }
};
export function helpSectionEmbed(id) {
    const section = sections[id] ?? sections['help:moderation'];
    return createEmbed(`${section.title} commands`, section.description, colors.brand).addFields({ name: 'Available now', value: section.commands });
}
function helpButtons() {
    return new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('help:moderation').setLabel('Moderation').setStyle(ButtonStyle.Danger), new ButtonBuilder().setCustomId('help:tickets').setLabel('Tickets').setStyle(ButtonStyle.Primary), new ButtonBuilder().setCustomId('help:management').setLabel('Management').setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId('help:utility').setLabel('Utility').setStyle(ButtonStyle.Success));
}
export const helpCommand = {
    data: new SlashCommandBuilder().setName('help').setDescription('Display Sentinel command categories.'),
    async execute(interaction) {
        const embed = createEmbed('Sentinel command centre', 'Choose a section below to see its commands and capabilities.')
            .addFields({ name: 'Moderation', value: 'Warnings, punishments, cases, and staff controls.', inline: true }, { name: 'Tickets', value: 'Private support channels and assignment.', inline: true }, { name: 'Management', value: 'Server settings and automation.', inline: true }, { name: 'Utility', value: 'Information and everyday tools.', inline: true });
        await interaction.reply({ embeds: [embed], components: [helpButtons()], ephemeral: true });
    }
};
