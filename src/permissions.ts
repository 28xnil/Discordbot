import { PermissionFlagsBits, type ChatInputCommandInteraction, type GuildMember } from 'discord.js';
import { errorEmbed } from './embeds.js';

export function requireGuild(interaction: ChatInputCommandInteraction): boolean {
  return Boolean(interaction.guild && interaction.member);
}

export function isStaff(member: GuildMember): boolean {
  return member.permissions.has(PermissionFlagsBits.ManageGuild) || member.permissions.has(PermissionFlagsBits.ModerateMembers);
}

export async function requireStaff(interaction: ChatInputCommandInteraction): Promise<boolean> {
  if (!requireGuild(interaction) || !isStaff(interaction.member as GuildMember)) {
    await interaction.reply({ embeds: [errorEmbed('You need staff permissions to use this command.')], ephemeral: true });
    return false;
  }
  return true;
}
