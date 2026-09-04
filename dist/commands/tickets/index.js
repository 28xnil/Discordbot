import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, ChannelType as DiscordChannelType, StringSelectMenuBuilder, SlashCommandBuilder } from 'discord.js';
import { createTicket, getGuildTickets, getTicketByChannel, getTicketConfig, updateTicket, updateTicketConfig } from '../../database.js';
import { createEmbed, colors, errorEmbed } from '../../embeds.js';
import { isStaff, requireStaff } from '../../permissions.js';
const ticketPanelButtonId = 'ticket:create';
function parseTopic(value) {
    const customEmoji = value.match(/^<(a?):([\w~]+):(\d+)>\s*(.+)$/);
    if (customEmoji) {
        return {
            emoji: { id: customEmoji[3], name: customEmoji[2], animated: customEmoji[1] === 'a' },
            name: customEmoji[4].trim()
        };
    }
    const [emoji, ...nameParts] = value.split('|');
    if (nameParts.length && emoji.trim())
        return { emoji: { unicode: emoji.trim() }, name: nameParts.join('|').trim() };
    return { name: value.trim() };
}
function topicValue(value) {
    return parseTopic(value).name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 100);
}
function isTicketChannel(interaction) {
    return Boolean(interaction.channel && getTicketByChannel(interaction.channel.id));
}
function ticketPanel(topics) {
    const menu = new StringSelectMenuBuilder()
        .setCustomId('ticket:topic')
        .setPlaceholder('Choose what you need help with')
        .addOptions(topics.slice(0, 25).map((topic) => {
        const parsed = parseTopic(topic);
        return { label: parsed.name, value: topicValue(topic), ...(parsed.emoji ? { emoji: parsed.emoji.id ? { id: parsed.emoji.id, name: parsed.emoji.name, animated: parsed.emoji.animated } : parsed.emoji.unicode } : {}) };
    }));
    return [
        new ActionRowBuilder().addComponents(menu),
        new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(ticketPanelButtonId).setLabel('General support ticket').setStyle(ButtonStyle.Secondary))
    ];
}
async function createTicketChannel(interaction, topic) {
    if (!interaction.guild)
        return;
    const ticketConfig = getTicketConfig(interaction.guild.id);
    const existingTickets = getGuildTickets(interaction.guild.id, 'OPEN').filter((ticket) => ticket.userId === interaction.user.id);
    const existing = existingTickets[0];
    if (existingTickets.length >= ticketConfig.userLimit) {
        const existingChannel = interaction.guild.channels.cache.get(existing.channelId);
        const message = createEmbed('Ticket limit reached', existingChannel ? `You can have up to ${ticketConfig.userLimit} open ticket(s): ${existingChannel}` : `You can have up to ${ticketConfig.userLimit} open ticket(s).`, colors.warning);
        await interaction.reply({ embeds: [message], ephemeral: true });
        return;
    }
    if (existing) {
        const existingChannel = interaction.guild.channels.cache.get(existing.channelId);
        const message = createEmbed('You already have an open ticket', existingChannel ? `Continue here: ${existingChannel}` : 'Your existing ticket is still open.', colors.warning);
        if (interaction.isButton())
            await interaction.reply({ embeds: [message], ephemeral: true });
        else
            await interaction.reply({ embeds: [message], ephemeral: true });
        return;
    }
    const memberRole = interaction.guild.roles.everyone;
    const channelName = ticketConfig.namingPattern.replace('{username}', interaction.user.username).replace('{id}', interaction.user.id).replace('{topic}', topic ?? 'support').toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 90);
    const staffOverwrite = ticketConfig.staffRoleId ? { id: ticketConfig.staffRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] } : null;
    const channel = await interaction.guild.channels.create({
        name: channelName || `ticket-${interaction.user.id}`,
        type: ChannelType.GuildText,
        parent: ticketConfig.categoryId,
        topic: `${topic ? `${topic} | ` : ''}Support ticket for ${interaction.user.tag}`,
        permissionOverwrites: [
            { id: memberRole.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
            ...(staffOverwrite ? [staffOverwrite] : []),
            { id: interaction.guild.members.me.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory] }
        ]
    });
    const ticket = createTicket({ guildId: interaction.guild.id, channelId: channel.id, userId: interaction.user.id, topic });
    const embed = createEmbed(`Ticket #${ticket.id}${topic ? ` | ${topic}` : ''}`, 'Thanks for reaching out. Describe your issue and a staff member will be with you shortly.')
        .addFields({ name: 'Actions', value: 'Use the buttons below to close or claim this ticket.' });
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket:close').setLabel('Close ticket').setStyle(ButtonStyle.Danger), new ButtonBuilder().setCustomId('ticket:claim').setLabel('Claim ticket').setStyle(ButtonStyle.Success));
    await channel.send({ content: `${interaction.user}`, embeds: [embed], components: [row] });
    if (ticketConfig.logChannelId) {
        const logChannel = interaction.guild.channels.cache.get(ticketConfig.logChannelId);
        if (logChannel?.isTextBased())
            await logChannel.send({ embeds: [createEmbed('Ticket created', `${channel} opened by ${interaction.user}.`, colors.success)] });
    }
    const confirmation = createEmbed('Ticket created', `Your private ticket is ready: ${channel}`, colors.success);
    if (interaction.isButton())
        await interaction.reply({ embeds: [confirmation], ephemeral: true });
    else
        await interaction.reply({ embeds: [confirmation], ephemeral: true });
}
export async function handleTicketButton(interaction) {
    if (!interaction.guild)
        return;
    if (interaction.customId === ticketPanelButtonId)
        return createTicketChannel(interaction);
    if (interaction.customId === 'ticket:topic' && interaction.isStringSelectMenu()) {
        const config = getTicketConfig(interaction.guild.id);
        const selected = config.topics.find((topic) => topicValue(topic) === interaction.values[0]);
        return createTicketChannel(interaction, selected ? parseTopic(selected).name : interaction.values[0]);
    }
    const ticket = getTicketByChannel(interaction.channelId);
    if (!ticket) {
        await interaction.reply({ content: 'This is not an active ticket channel.', ephemeral: true });
        return;
    }
    if (interaction.customId === 'ticket:claim') {
        if (!interaction.member || !('permissions' in interaction.member) || !isStaff(interaction.member)) {
            await interaction.reply({ embeds: [errorEmbed('You need staff permissions to claim tickets.')], ephemeral: true });
            return;
        }
        updateTicket(ticket.id, { claimedBy: interaction.user.id });
        await interaction.reply({ embeds: [createEmbed('Ticket claimed', `${interaction.user} is now handling this ticket.`, colors.success)] });
    }
    if (interaction.customId === 'ticket:close') {
        if (ticket.userId !== interaction.user.id && !interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            await interaction.reply({ content: 'Only the ticket owner or staff can close this ticket.', ephemeral: true });
            return;
        }
        updateTicket(ticket.id, { status: 'CLOSED', closedAt: new Date().toISOString() });
        await interaction.reply({ embeds: [createEmbed('Ticket closed', 'This channel will be deleted in 10 seconds.', colors.warning)] });
        setTimeout(() => interaction.channel?.delete('Ticket closed'), 10_000);
    }
}
const ticketCommand = {
    data: new SlashCommandBuilder().setName('ticket').setDescription('Manage support tickets.')
        .addSubcommand((command) => command.setName('panel').setDescription('Post the ticket creation panel.'))
        .addSubcommand((command) => command.setName('create').setDescription('Create a private support ticket.'))
        .addSubcommand((command) => command.setName('close').setDescription('Close the current ticket.'))
        .addSubcommand((command) => command.setName('reopen').setDescription('Reopen the current ticket.'))
        .addSubcommand((command) => command.setName('delete').setDescription('Delete the current ticket channel.'))
        .addSubcommand((command) => command.setName('rename').setDescription('Rename the current ticket.').addStringOption((option) => option.setName('name').setDescription('New channel name.').setRequired(true)))
        .addSubcommand((command) => command.setName('claim').setDescription('Claim the current ticket.'))
        .addSubcommand((command) => command.setName('unclaim').setDescription('Remove your claim from the current ticket.'))
        .addSubcommand((command) => command.setName('list').setDescription('List active tickets.'))
        .addSubcommand((command) => command.setName('config').setDescription('Configure ticket behavior.')
        .addStringOption((option) => option.setName('setting').setDescription('Setting to change.').setRequired(true).addChoices({ name: 'Category', value: 'category' }, { name: 'Staff role', value: 'staff-role' }, { name: 'Log channel', value: 'logs' }, { name: 'Naming pattern', value: 'naming' }, { name: 'User limit', value: 'limit' }, { name: 'Topics', value: 'topics' }))
        .addChannelOption((option) => option.setName('channel').setDescription('Category or text log channel.').addChannelTypes(ChannelType.GuildCategory, ChannelType.GuildText))
        .addRoleOption((option) => option.setName('role').setDescription('Role that can see tickets.'))
        .addStringOption((option) => option.setName('value').setDescription('Naming pattern or numeric limit.'))),
    async execute(interaction) {
        if (!interaction.guild)
            return;
        const subcommand = interaction.options.getSubcommand();
        if (subcommand === 'config') {
            if (!(await requireStaff(interaction)))
                return;
            const setting = interaction.options.getString('setting', true);
            const channel = interaction.options.getChannel('channel');
            const role = interaction.options.getRole('role');
            const value = interaction.options.getString('value');
            if (setting === 'category') {
                if (!channel || channel.type !== DiscordChannelType.GuildCategory)
                    return interaction.reply({ embeds: [errorEmbed('Choose a category channel.')], ephemeral: true });
                updateTicketConfig(interaction.guild.id, { categoryId: channel.id });
            }
            else if (setting === 'staff-role') {
                if (!role)
                    return interaction.reply({ embeds: [errorEmbed('Choose a staff role.')], ephemeral: true });
                updateTicketConfig(interaction.guild.id, { staffRoleId: role.id });
            }
            else if (setting === 'logs') {
                if (!channel || ![DiscordChannelType.GuildText, DiscordChannelType.GuildAnnouncement].includes(channel.type))
                    return interaction.reply({ embeds: [errorEmbed('Choose a text channel for ticket logs.')], ephemeral: true });
                updateTicketConfig(interaction.guild.id, { logChannelId: channel.id });
            }
            else if (setting === 'naming') {
                if (!value || !value.includes('{username}') && !value.includes('{id}'))
                    return interaction.reply({ embeds: [errorEmbed('Naming must include `{username}` or `{id}`.')], ephemeral: true });
                updateTicketConfig(interaction.guild.id, { namingPattern: value });
            }
            else if (setting === 'limit') {
                const limit = Number(value);
                if (!Number.isInteger(limit) || limit < 1 || limit > 10)
                    return interaction.reply({ embeds: [errorEmbed('The user limit must be a whole number from 1 to 10.')], ephemeral: true });
                updateTicketConfig(interaction.guild.id, { userLimit: limit });
            }
            else if (setting === 'topics') {
                const topics = (value ?? '').split(',').map((topic) => topic.trim()).filter(Boolean).slice(0, 25);
                if (!topics.length)
                    return interaction.reply({ embeds: [errorEmbed('Add at least one topic, separated by commas.')], ephemeral: true });
                updateTicketConfig(interaction.guild.id, { topics });
            }
            const settings = getTicketConfig(interaction.guild.id);
            await interaction.reply({ embeds: [createEmbed('Ticket configuration updated', `Category: ${settings.categoryId ? `<#${settings.categoryId}>` : 'not set'}\nStaff role: ${settings.staffRoleId ? `<@&${settings.staffRoleId}>` : 'not set'}\nLogs: ${settings.logChannelId ? `<#${settings.logChannelId}>` : 'not set'}\nNaming: "${settings.namingPattern}"\nOpen-ticket limit: **${settings.userLimit}**\nTopics: ${settings.topics.join(', ')}`, colors.success)], ephemeral: true });
        }
        else if (subcommand === 'panel') {
            if (!(await requireStaff(interaction)))
                return;
            const settings = getTicketConfig(interaction.guild.id);
            await interaction.reply({ embeds: [createEmbed('Need help?', 'Choose a topic below and Sentinel will create a private support ticket.')], components: ticketPanel(settings.topics) });
        }
        else if (subcommand === 'create') {
            await createTicketChannel(interaction);
        }
        else if (subcommand === 'list') {
            if (!(await requireStaff(interaction)))
                return;
            const tickets = getGuildTickets(interaction.guild.id, 'OPEN');
            const description = tickets.length ? tickets.map((ticket) => `**#${ticket.id}** <#${ticket.channelId}> <@${ticket.userId}>${ticket.claimedBy ? ` | claimed by <@${ticket.claimedBy}>` : ''}`).join('\n') : 'No active tickets.';
            await interaction.reply({ embeds: [createEmbed('Active tickets', description)], ephemeral: true });
        }
        else {
            if (!isTicketChannel(interaction))
                return interaction.reply({ content: 'This command can only be used inside a ticket channel.', ephemeral: true });
            const ticket = getTicketByChannel(interaction.channel.id);
            const channel = interaction.channel;
            if (subcommand === 'close') {
                updateTicket(ticket.id, { status: 'CLOSED', closedAt: new Date().toISOString() });
                await interaction.reply({ embeds: [createEmbed('Ticket closed', 'This channel will be deleted in 10 seconds.', colors.warning)] });
                setTimeout(() => channel.delete('Ticket closed'), 10_000);
            }
            else if (subcommand === 'reopen') {
                updateTicket(ticket.id, { status: 'OPEN', closedAt: undefined });
                await interaction.reply({ embeds: [createEmbed('Ticket reopened', 'This ticket is active again.', colors.success)] });
            }
            else if (subcommand === 'delete') {
                if (!(await requireStaff(interaction)))
                    return;
                await interaction.reply({ embeds: [createEmbed('Deleting ticket', 'This channel will be removed now.', colors.danger)] });
                await channel.delete('Ticket deleted');
            }
            else if (subcommand === 'rename') {
                const name = interaction.options.getString('name', true).toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 90);
                await channel.setName(name);
                await interaction.reply({ embeds: [createEmbed('Ticket renamed', `Channel renamed to **${name}**.`, colors.success)] });
            }
            else if (subcommand === 'claim' || subcommand === 'unclaim') {
                if (!(await requireStaff(interaction)))
                    return;
                updateTicket(ticket.id, subcommand === 'claim' ? { claimedBy: interaction.user.id } : { claimedBy: undefined });
                await interaction.reply({ embeds: [createEmbed(subcommand === 'claim' ? 'Ticket claimed' : 'Ticket unclaimed', `${interaction.user} updated the assignment.`, colors.success)] });
            }
        }
    }
};
export const ticketCommands = [ticketCommand];
