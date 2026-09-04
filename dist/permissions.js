import { PermissionFlagsBits } from 'discord.js';
import { errorEmbed } from './embeds.js';
export function requireGuild(interaction) {
    return Boolean(interaction.guild && interaction.member);
}
export function isStaff(member) {
    return member.permissions.has(PermissionFlagsBits.ManageGuild) || member.permissions.has(PermissionFlagsBits.ModerateMembers);
}
export async function requireStaff(interaction) {
    if (!requireGuild(interaction) || !isStaff(interaction.member)) {
        await interaction.reply({ embeds: [errorEmbed('You need staff permissions to use this command.')], ephemeral: true });
        return false;
    }
    return true;
}
