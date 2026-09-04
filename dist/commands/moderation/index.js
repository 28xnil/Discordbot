import { SlashCommandBuilder } from 'discord.js';
import { addCase, getCase, getUserCases, removeCase, totalWarningPoints } from '../../database.js';
import { requireStaff } from '../../permissions.js';
import { createEmbed, colors, errorEmbed } from '../../embeds.js';
function memberOption(command, name, description) {
    return command.addUserOption((option) => option.setName(name).setDescription(description).setRequired(true));
}
function getTarget(interaction, name = 'user') {
    return interaction.options.getMember(name);
}
function getReason(interaction) {
    return interaction.options.getString('reason') ?? 'No reason provided';
}
function formatCase(caseItem) {
    if (!caseItem)
        return 'Case not found.';
    return `Case #${caseItem.id} | ${caseItem.type} | ${caseItem.reason} | ${caseItem.createdAt}`;
}
const warn = {
    data: memberOption(new SlashCommandBuilder().setName('warn').setDescription('Warn a member.'), 'user', 'Member to warn.')
        .addStringOption((option) => option.setName('reason').setDescription('Reason for the warning.').setRequired(true)),
    async execute(interaction) {
        if (!(await requireStaff(interaction)) || !interaction.guild)
            return;
        const target = getTarget(interaction);
        if (!target)
            return interaction.reply({ embeds: [errorEmbed('That member is not in this server.')], ephemeral: true });
        const reason = getReason(interaction);
        const points = 1;
        const caseItem = await addCase({ guildId: interaction.guild.id, userId: target.id, moderatorId: interaction.user.id, type: 'WARN', reason, points });
        const total = await totalWarningPoints(interaction.guild.id, target.id);
        await interaction.reply({ embeds: [createEmbed('Warning issued', `${target.user.tag} received a warning.\nCase: **#${caseItem.id}**\nWarning points: **${total}**`, colors.warning)] });
        if (total >= 7)
            await target.ban({ reason: `Automatic escalation: ${total} warning points` });
        else if (total >= 5)
            await target.kick(`Automatic escalation: ${total} warning points`);
        else if (total >= 3)
            await target.timeout(10 * 60 * 1000, `Automatic escalation: ${total} warning points`);
    }
};
const warnings = {
    data: memberOption(new SlashCommandBuilder().setName('warnings').setDescription('View a member\'s warnings.'), 'user', 'Member to inspect.'),
    async execute(interaction) {
        if (!(await requireStaff(interaction)) || !interaction.guild)
            return;
        const target = interaction.options.getUser('user', true);
        const cases = (await getUserCases(interaction.guild.id, target.id)).filter((item) => item.type === 'WARN');
        if (!cases.length)
            return interaction.reply({ embeds: [createEmbed('Warnings', `${target.tag} has no warnings.`, colors.success)], ephemeral: true });
        await interaction.reply({ embeds: [createEmbed(`Warnings for ${target.tag}`, `${cases.length} warning(s) | ${await totalWarningPoints(interaction.guild.id, target.id)} point(s)\n\n${cases.slice(0, 10).map(formatCase).join('\n')}`)], ephemeral: true });
    }
};
const clearWarnings = {
    data: memberOption(new SlashCommandBuilder().setName('clearwarnings').setDescription('Remove all warnings from a member.'), 'user', 'Member to clear.'),
    async execute(interaction) {
        if (!(await requireStaff(interaction)) || !interaction.guild)
            return;
        const target = interaction.options.getUser('user', true);
        const cases = (await getUserCases(interaction.guild.id, target.id)).filter((item) => item.type === 'WARN');
        await Promise.all(cases.map((item) => removeCase(item.id)));
        await interaction.reply({ embeds: [createEmbed('Warnings cleared', `Removed ${cases.length} warning(s) from ${target.tag}.`, colors.success)] });
    }
};
const unwarn = {
    data: new SlashCommandBuilder().setName('unwarn').setDescription('Remove a specific warning case.')
        .addIntegerOption((option) => option.setName('id').setDescription('Warning case ID.').setRequired(true)),
    async execute(interaction) {
        if (!(await requireStaff(interaction)))
            return;
        const id = interaction.options.getInteger('id', true);
        const caseItem = await getCase(id);
        if (!caseItem || caseItem.type !== 'WARN')
            return interaction.reply({ embeds: [errorEmbed('Warning case not found.')], ephemeral: true });
        if (caseItem.guildId !== interaction.guildId)
            return interaction.reply({ embeds: [errorEmbed('That case belongs to another server.')], ephemeral: true });
        await removeCase(id);
        await interaction.reply({ embeds: [createEmbed('Warning removed', `Removed warning case **#${id}**.`, colors.success)] });
    }
};
async function moderateMember(interaction, action) {
    if (!(await requireStaff(interaction)) || !interaction.guild)
        return;
    const target = getTarget(interaction);
    if (!target)
        return interaction.reply({ embeds: [errorEmbed('That member is not in this server.')], ephemeral: true });
    if (target.id === interaction.user.id || target.id === interaction.guild.ownerId)
        return interaction.reply({ embeds: [errorEmbed('You cannot moderate that member.')], ephemeral: true });
    const reason = getReason(interaction);
    if (action === 'TIMEOUT')
        await target.timeout(interaction.options.getInteger('duration', true) * 60 * 1000, reason);
    if (action === 'KICK')
        await target.kick(reason);
    if (action === 'BAN')
        await target.ban({ reason });
    await addCase({ guildId: interaction.guild.id, userId: target.id, moderatorId: interaction.user.id, type: action, reason, points: 0 });
    await interaction.reply({ embeds: [createEmbed(`${action} applied`, `${action.toLowerCase()} applied to ${target.user.tag}.`, colors.success)] });
}
const timeout = {
    data: memberOption(new SlashCommandBuilder().setName('timeout').setDescription('Timeout a member.'), 'user', 'Member to timeout.')
        .addIntegerOption((option) => option.setName('duration').setDescription('Duration in minutes.').setMinValue(1).setMaxValue(40320).setRequired(true))
        .addStringOption((option) => option.setName('reason').setDescription('Reason for the timeout.').setRequired(true)),
    execute: (interaction) => moderateMember(interaction, 'TIMEOUT')
};
const kick = {
    data: memberOption(new SlashCommandBuilder().setName('kick').setDescription('Kick a member.'), 'user', 'Member to kick.')
        .addStringOption((option) => option.setName('reason').setDescription('Reason for the kick.').setRequired(true)),
    execute: (interaction) => moderateMember(interaction, 'KICK')
};
const ban = {
    data: memberOption(new SlashCommandBuilder().setName('ban').setDescription('Ban a member.'), 'user', 'Member to ban.')
        .addStringOption((option) => option.setName('reason').setDescription('Reason for the ban.').setRequired(true)),
    execute: (interaction) => moderateMember(interaction, 'BAN')
};
const untimeout = {
    data: memberOption(new SlashCommandBuilder().setName('untimeout').setDescription('Remove a member timeout.'), 'user', 'Member to restore.'),
    async execute(interaction) {
        if (!(await requireStaff(interaction)))
            return;
        const target = getTarget(interaction);
        if (!target)
            return interaction.reply({ content: 'That member is not in this server.', ephemeral: true });
        await target.timeout(null, 'Timeout removed by moderator');
        await interaction.reply(`Removed timeout from ${target.user.tag}.`);
    }
};
const unban = {
    data: new SlashCommandBuilder().setName('unban').setDescription('Unban a user by ID.')
        .addStringOption((option) => option.setName('user_id').setDescription('User ID to unban.').setRequired(true))
        .addStringOption((option) => option.setName('reason').setDescription('Reason for the unban.')),
    async execute(interaction) {
        if (!(await requireStaff(interaction)) || !interaction.guild)
            return;
        const userId = interaction.options.getString('user_id', true);
        const reason = getReason(interaction);
        await interaction.guild.members.unban(userId, reason);
        await addCase({ guildId: interaction.guild.id, userId, moderatorId: interaction.user.id, type: 'UNBAN', reason, points: 0 });
        await interaction.reply(`Unbanned ${userId}.`);
    }
};
const cases = {
    data: memberOption(new SlashCommandBuilder().setName('cases').setDescription('View recent moderation cases for a member.'), 'user', 'Member to inspect.'),
    async execute(interaction) {
        if (!(await requireStaff(interaction)) || !interaction.guild)
            return;
        const target = interaction.options.getUser('user', true);
        const history = (await getUserCases(interaction.guild.id, target.id)).slice(0, 15);
        await interaction.reply({ content: history.length ? history.map(formatCase).join('\n') : 'No moderation cases found.', ephemeral: true });
    }
};
const caseCommand = {
    data: new SlashCommandBuilder().setName('case').setDescription('View a moderation case.')
        .addIntegerOption((option) => option.setName('id').setDescription('Case ID.').setRequired(true)),
    async execute(interaction) {
        if (!(await requireStaff(interaction)))
            return;
        const caseItem = await getCase(interaction.options.getInteger('id', true));
        if (!caseItem || caseItem.guildId !== interaction.guildId)
            return interaction.reply({ content: 'Case not found.', ephemeral: true });
        await interaction.reply({ content: formatCase(caseItem), ephemeral: true });
    }
};
export const moderationCommands = [warn, warnings, clearWarnings, unwarn, timeout, untimeout, kick, ban, unban, cases, caseCommand];
