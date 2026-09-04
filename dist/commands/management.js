import { SlashCommandBuilder } from 'discord.js';
import { getAutoModConfig, getTicketConfig, resetGuildSettings } from '../database.js';
import { createEmbed, colors, errorEmbed } from '../embeds.js';
import { requireStaff } from '../permissions.js';
export const configCommand = {
    data: new SlashCommandBuilder().setName('config').setDescription('Manage server configuration.')
        .addSubcommand((command) => command.setName('view').setDescription('View current server configuration.'))
        .addSubcommand((command) => command.setName('reset').setDescription('Reset ticket and AutoMod configuration.')),
    async execute(interaction) {
        if (!(await requireStaff(interaction)) || !interaction.guild)
            return;
        if (interaction.options.getSubcommand() === 'reset') {
            await resetGuildSettings(interaction.guild.id);
            await interaction.reply({ embeds: [createEmbed('Configuration reset', 'Ticket and AutoMod settings were restored to their defaults.', colors.success)], ephemeral: true });
            return;
        }
        const tickets = await getTicketConfig(interaction.guild.id);
        const automod = await getAutoModConfig(interaction.guild.id);
        await interaction.reply({ embeds: [createEmbed('Server configuration', `Ticket category: ${tickets.categoryId ? `<#${tickets.categoryId}>` : 'not set'}\nTicket staff role: ${tickets.staffRoleId ? `<@&${tickets.staffRoleId}>` : 'not set'}\nTicket log channel: ${tickets.logChannelId ? `<#${tickets.logChannelId}>` : 'not set'}\nTicket topics: ${tickets.topics.join(', ')}\nAutoMod: **${automod.enabled ? 'enabled' : 'disabled'}**\nAutoMod blocked words: **${automod.blockedWords.length}**`)], ephemeral: true });
    }
};
export const roleCommands = [
    {
        data: new SlashCommandBuilder().setName('role').setDescription('Manage server roles.')
            .addSubcommand((command) => command.setName('create').setDescription('Create a role.').addStringOption((option) => option.setName('name').setDescription('Role name.').setRequired(true)))
            .addSubcommand((command) => command.setName('delete').setDescription('Delete a role.').addRoleOption((option) => option.setName('role').setDescription('Role to delete.').setRequired(true)))
            .addSubcommand((command) => command.setName('add').setDescription('Give a role to a member.').addUserOption((option) => option.setName('user').setDescription('Member.').setRequired(true)).addRoleOption((option) => option.setName('role').setDescription('Role.').setRequired(true)))
            .addSubcommand((command) => command.setName('remove').setDescription('Remove a role from a member.').addUserOption((option) => option.setName('user').setDescription('Member.').setRequired(true)).addRoleOption((option) => option.setName('role').setDescription('Role.').setRequired(true))),
        async execute(interaction) {
            if (!(await requireStaff(interaction)) || !interaction.guild)
                return;
            const subcommand = interaction.options.getSubcommand();
            if (subcommand === 'create') {
                const name = interaction.options.getString('name', true);
                const role = await interaction.guild.roles.create({ name, reason: `Created by ${interaction.user.tag}` });
                await interaction.reply({ embeds: [createEmbed('Role created', `${role} was created.`, colors.success)] });
            }
            else if (subcommand === 'delete') {
                const role = interaction.options.getRole('role', true);
                if (role.managed || role.position >= (interaction.guild.members.me?.roles.highest.position ?? 0))
                    return interaction.reply({ embeds: [errorEmbed('I cannot manage that role.')], ephemeral: true });
                await role.delete(`Deleted by ${interaction.user.tag}`);
                await interaction.reply({ embeds: [createEmbed('Role deleted', `Deleted **${role.name}**.`, colors.success)] });
            }
            else {
                const user = interaction.options.getUser('user', true);
                const role = interaction.options.getRole('role', true);
                const member = await interaction.guild.members.fetch(user.id);
                if (role.managed || role.position >= (interaction.guild.members.me?.roles.highest.position ?? 0))
                    return interaction.reply({ embeds: [errorEmbed('I cannot manage that role.')], ephemeral: true });
                if (subcommand === 'add')
                    await member.roles.add(role);
                else
                    await member.roles.remove(role);
                await interaction.reply({ embeds: [createEmbed('Role updated', `${role} was ${subcommand === 'add' ? 'added to' : 'removed from'} ${member}.`, colors.success)] });
            }
        }
    }
];
