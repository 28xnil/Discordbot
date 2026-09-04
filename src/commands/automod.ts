import { SlashCommandBuilder } from 'discord.js';
import { getAutoModConfig, updateAutoModConfig } from '../database.js';
import { createEmbed, colors, errorEmbed } from '../embeds.js';
import { requireStaff } from '../permissions.js';
import type { Command } from '../types.js';

export const automodCommand: Command = {
  data: new SlashCommandBuilder().setName('automod').setDescription('Configure automatic moderation.')
    .addSubcommand((command) => command.setName('status').setDescription('View automatic moderation settings.'))
    .addSubcommand((command) => command.setName('enable').setDescription('Enable automatic moderation.'))
    .addSubcommand((command) => command.setName('disable').setDescription('Disable automatic moderation.'))
    .addSubcommand((command) => command.setName('set').setDescription('Toggle an automatic moderation rule.')
      .addStringOption((option) => option.setName('rule').setDescription('Rule to change.').setRequired(true).addChoices(
        { name: 'Links', value: 'links' }, { name: 'Invites', value: 'invites' }, { name: 'Excessive caps', value: 'caps' }, { name: 'Mention spam', value: 'mentions' }
      ))
      .addBooleanOption((option) => option.setName('enabled').setDescription('Whether this rule is enabled.').setRequired(true)))
    .addSubcommand((command) => command.setName('words').setDescription('Replace the blocked-word list.')
      .addStringOption((option) => option.setName('list').setDescription('Comma-separated words, or blank to clear.').setRequired(true)))
    .addSubcommand((command) => command.setName('spam').setDescription('Set messages allowed in the anti-spam window.')
      .addIntegerOption((option) => option.setName('limit').setDescription('Messages per 10 seconds.').setMinValue(2).setMaxValue(20).setRequired(true))),
  async execute(interaction) {
    if (!(await requireStaff(interaction)) || !interaction.guild) return;
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'status') {
      const settings = await getAutoModConfig(interaction.guild.id);
      await interaction.reply({ embeds: [createEmbed('AutoMod status', `Enabled: **${settings.enabled ? 'yes' : 'no'}**\nLinks: **${settings.blockLinks ? 'yes' : 'no'}**\nInvites: **${settings.blockInvites ? 'yes' : 'no'}**\nExcessive caps: **${settings.blockCaps ? 'yes' : 'no'}**\nMention spam: **${settings.blockMentions ? 'yes' : 'no'}**\nSpam limit: **${settings.spamLimit} messages / 10 seconds**\nBlocked words: **${settings.blockedWords.length}**`)], ephemeral: true });
    } else if (subcommand === 'enable' || subcommand === 'disable') {
      const settings = await updateAutoModConfig(interaction.guild.id, { enabled: subcommand === 'enable' });
      await interaction.reply({ embeds: [createEmbed('AutoMod updated', `Automatic moderation is now **${settings.enabled ? 'enabled' : 'disabled'}**.`, colors.success)], ephemeral: true });
    } else if (subcommand === 'set') {
      const rule = interaction.options.getString('rule', true);
      const enabled = interaction.options.getBoolean('enabled', true);
      const key = ({ links: 'blockLinks', invites: 'blockInvites', caps: 'blockCaps', mentions: 'blockMentions' } as const)[rule as 'links' | 'invites' | 'caps' | 'mentions'];
      await updateAutoModConfig(interaction.guild.id, { [key]: enabled });
      await interaction.reply({ embeds: [createEmbed('AutoMod rule updated', `**${rule}** filtering is now **${enabled ? 'enabled' : 'disabled'}**.`, colors.success)], ephemeral: true });
    } else if (subcommand === 'words') {
      const list = interaction.options.getString('list', true).split(',').map((word) => word.trim().toLowerCase()).filter(Boolean).slice(0, 100);
      await updateAutoModConfig(interaction.guild.id, { blockedWords: list });
      await interaction.reply({ embeds: [createEmbed('Blocked words updated', list.length ? `Tracking **${list.length}** blocked word(s).` : 'The blocked-word list is empty.', colors.success)], ephemeral: true });
    } else if (subcommand === 'spam') {
      const limit = interaction.options.getInteger('limit', true);
      await updateAutoModConfig(interaction.guild.id, { spamLimit: limit });
      await interaction.reply({ embeds: [createEmbed('Anti-spam updated', `Members may send **${limit} messages per 10 seconds** before automod intervenes.`, colors.success)], ephemeral: true });
    }
  }
};
