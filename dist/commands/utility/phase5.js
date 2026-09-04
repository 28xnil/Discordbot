import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { createEmbed, colors, errorEmbed } from '../../embeds.js';
function userOption(command, description = 'User to inspect.') {
    return command.addUserOption((option) => option.setName('user').setDescription(description));
}
function parseDuration(value) {
    const match = value.trim().toLowerCase().match(/^(\d+)\s*(s|m|h|d)$/);
    if (!match)
        return undefined;
    const amount = Number(match[1]);
    const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
    const duration = amount * multipliers[match[2]];
    return duration > 0 && duration <= 7 * 86_400_000 ? duration : undefined;
}
function formatDuration(milliseconds) {
    const minutes = Math.round(milliseconds / 60_000);
    if (minutes < 60)
        return `${minutes} minute(s)`;
    return `${Math.round(minutes / 60)} hour(s)`;
}
export const botInfoCommand = {
    data: new SlashCommandBuilder().setName('botinfo').setDescription('Show Sentinel bot information.'),
    async execute(interaction) {
        const client = interaction.client;
        const uptime = client.uptime ?? 0;
        await interaction.reply({ embeds: [createEmbed('Sentinel bot information', `Version: **0.1.0**\nWebSocket ping: **${client.ws.ping}ms**\nUptime: **${formatDuration(uptime)}**\nServers: **${client.guilds.cache.size}**\nCommands: **${client.application?.commands.cache.size || 'synced'}**`)] });
    }
};
export const serverInfoCommand = {
    data: new SlashCommandBuilder().setName('serverinfo').setDescription('Show information about this server.'),
    async execute(interaction) {
        if (!interaction.guild)
            return;
        await interaction.reply({ embeds: [createEmbed(`${interaction.guild.name}`, `Owner: <@${interaction.guild.ownerId}>\nMembers: **${interaction.guild.memberCount}**\nChannels: **${interaction.guild.channels.cache.size}**\nRoles: **${interaction.guild.roles.cache.size}**\nCreated: <t:${Math.floor(interaction.guild.createdTimestamp / 1000)}:F>`).setThumbnail(interaction.guild.iconURL({ size: 256 }) ?? '')] });
    }
};
export const userInfoCommand = {
    data: userOption(new SlashCommandBuilder().setName('userinfo').setDescription('Show information about a user.')),
    async execute(interaction) {
        const user = interaction.options.getUser('user') ?? interaction.user;
        const member = interaction.guild?.members.cache.get(user.id);
        await interaction.reply({ embeds: [createEmbed(`${user.tag}`, `User ID: **${user.id}**\nBot: **${user.bot ? 'yes' : 'no'}**\nCreated: <t:${Math.floor(user.createdTimestamp / 1000)}:F>${member ? `\nJoined: <t:${Math.floor(member.joinedTimestamp / 1000)}:F>` : ''}`).setThumbnail(user.displayAvatarURL({ size: 256 }))] });
    }
};
export const avatarCommand = {
    data: userOption(new SlashCommandBuilder().setName('avatar').setDescription('Show a user avatar.')),
    async execute(interaction) {
        const user = interaction.options.getUser('user') ?? interaction.user;
        await interaction.reply({ embeds: [createEmbed(`${user.tag}'s avatar`, `[Open full-size avatar](${user.displayAvatarURL({ size: 4096, extension: 'png' })})`).setImage(user.displayAvatarURL({ size: 4096 }))] });
    }
};
export const bannerCommand = {
    data: userOption(new SlashCommandBuilder().setName('banner').setDescription('Show a user profile banner.')),
    async execute(interaction) {
        const user = await (interaction.options.getUser('user') ?? interaction.user).fetch();
        const banner = user.bannerURL({ size: 4096 });
        if (!banner)
            return interaction.reply({ embeds: [errorEmbed(`${user.tag} does not have a profile banner.`)], ephemeral: true });
        await interaction.reply({ embeds: [createEmbed(`${user.tag}'s banner`, `[Open full-size banner](${banner})`).setImage(banner)] });
    }
};
export const roleInfoCommand = {
    data: new SlashCommandBuilder().setName('roleinfo').setDescription('Show role information.')
        .addRoleOption((option) => option.setName('role').setDescription('Role to inspect.').setRequired(true)),
    async execute(interaction) {
        const role = interaction.options.getRole('role', true);
        await interaction.reply({ embeds: [createEmbed(`Role: ${role.name}`, `ID: **${role.id}**\nColor: **${role.hexColor}**\nPosition: **${role.position}**\nMentionable: **${role.mentionable ? 'yes' : 'no'}**\nMembers: **${role.members.size}**`)] });
    }
};
export const channelInfoCommand = {
    data: new SlashCommandBuilder().setName('channelinfo').setDescription('Show channel information.')
        .addChannelOption((option) => option.setName('channel').setDescription('Channel to inspect.')),
    async execute(interaction) {
        const channel = interaction.options.getChannel('channel') ?? interaction.channel;
        if (!channel)
            return interaction.reply({ embeds: [errorEmbed('Channel not found.')], ephemeral: true });
        const channelName = 'name' in channel ? channel.name : 'unknown';
        const createdTimestamp = ('createdTimestamp' in channel && channel.createdTimestamp) || Date.now();
        await interaction.reply({ embeds: [createEmbed(`Channel: ${channelName}`, `ID: **${channel.id}**\nType: **${ChannelType[channel.type]}**\nCreated: <t:${Math.floor(createdTimestamp / 1000)}:F>`)] });
    }
};
export const permissionsCommand = {
    data: userOption(new SlashCommandBuilder().setName('permissions').setDescription('Show a member permissions.')),
    async execute(interaction) {
        if (!interaction.guild)
            return;
        const user = interaction.options.getUser('user') ?? interaction.user;
        const member = await interaction.guild.members.fetch(user.id);
        const permissions = member.permissions.has(PermissionFlagsBits.Administrator) ? ['Administrator'] : member.permissions.toArray();
        await interaction.reply({ embeds: [createEmbed(`Permissions for ${user.tag}`, permissions.length ? permissions.map((permission) => `\`${permission}\``).join(', ') : 'No explicit permissions.')], ephemeral: true });
    }
};
export const memberCountCommand = {
    data: new SlashCommandBuilder().setName('membercount').setDescription('Show the server member count.'),
    async execute(interaction) {
        if (!interaction.guild)
            return;
        await interaction.reply({ embeds: [createEmbed('Member count', `This server has **${interaction.guild.memberCount}** members.`)] });
    }
};
export const chooseCommand = {
    data: new SlashCommandBuilder().setName('choose').setDescription('Choose randomly from a comma-separated list.')
        .addStringOption((option) => option.setName('options').setDescription('Options separated by commas.').setRequired(true)),
    async execute(interaction) {
        const options = interaction.options.getString('options', true).split(',').map((option) => option.trim()).filter(Boolean);
        if (options.length < 2)
            return interaction.reply({ embeds: [errorEmbed('Provide at least two comma-separated options.')], ephemeral: true });
        await interaction.reply({ embeds: [createEmbed('Choice selected', `I choose: **${options[Math.floor(Math.random() * options.length)]}**`, colors.success)] });
    }
};
export const rollCommand = {
    data: new SlashCommandBuilder().setName('roll').setDescription('Roll a random number.')
        .addIntegerOption((option) => option.setName('max').setDescription('Highest possible result.').setMinValue(2).setMaxValue(1_000_000).setRequired(true)),
    async execute(interaction) {
        const max = interaction.options.getInteger('max', true);
        await interaction.reply({ embeds: [createEmbed('Dice roll', `You rolled **${Math.floor(Math.random() * max) + 1}** (1-${max}).`, colors.success)] });
    }
};
export const pollCommand = {
    data: new SlashCommandBuilder().setName('poll').setDescription('Create a simple poll.')
        .addStringOption((option) => option.setName('question').setDescription('Poll question.').setRequired(true))
        .addStringOption((option) => option.setName('options').setDescription('Optional comma-separated choices.')),
    async execute(interaction) {
        const question = interaction.options.getString('question', true);
        const options = interaction.options.getString('options')?.split(',').map((option) => option.trim()).filter(Boolean) ?? [];
        const choices = options.length ? options.slice(0, 10).map((option, index) => `${index + 1}. ${option}`).join('\n') : 'React with 👍 for yes or 👎 for no.';
        const response = await interaction.reply({ embeds: [createEmbed('Poll', `**${question}**\n\n${choices}`)], fetchReply: true });
        await response.react('👍');
        await response.react('👎');
    }
};
export const remindCommand = {
    data: new SlashCommandBuilder().setName('remind').setDescription('Set a reminder for yourself.')
        .addStringOption((option) => option.setName('time').setDescription('Examples: 10m, 2h, 1d. Maximum 7d.').setRequired(true))
        .addStringOption((option) => option.setName('message').setDescription('Reminder message.').setRequired(true)),
    async execute(interaction) {
        const duration = parseDuration(interaction.options.getString('time', true));
        if (!duration)
            return interaction.reply({ embeds: [errorEmbed('Use a duration like `10m`, `2h`, or `1d`. The maximum is 7 days.')], ephemeral: true });
        const message = interaction.options.getString('message', true);
        await interaction.reply({ embeds: [createEmbed('Reminder set', `I will remind you in **${formatDuration(duration)}**.`, colors.success)], ephemeral: true });
        setTimeout(() => interaction.user.send({ embeds: [createEmbed('Reminder', message, colors.warning)] }).catch(() => undefined), duration);
    }
};
export const utilityCommands = [botInfoCommand, serverInfoCommand, userInfoCommand, avatarCommand, bannerCommand, roleInfoCommand, channelInfoCommand, permissionsCommand, memberCountCommand, chooseCommand, rollCommand, pollCommand, remindCommand];
