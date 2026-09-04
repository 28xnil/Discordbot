import { getLogChannel } from './database.js';
import { createEmbed, colors } from './embeds.js';
export async function logGuildEvent(guild, title, description, color = colors.neutral) {
    const channelId = await getLogChannel(guild.id);
    const channel = channelId ? guild.channels.cache.get(channelId) : undefined;
    if (channel?.isTextBased())
        await channel.send({ embeds: [createEmbed(title, description, color)] }).catch(() => undefined);
}
export function registerLogging(client) {
    client.on('guildMemberAdd', (member) => logGuildEvent(member.guild, 'Member joined', `${member.user} joined the server.`, colors.success));
    client.on('guildMemberRemove', (member) => logGuildEvent(member.guild, 'Member left', `${member.user.tag} left the server.`, colors.warning));
    client.on('guildBanAdd', (ban) => logGuildEvent(ban.guild, 'Member banned', `${ban.user.tag} was banned.`, colors.danger));
    client.on('guildBanRemove', (ban) => logGuildEvent(ban.guild, 'Member unbanned', `${ban.user.tag} was unbanned.`, colors.success));
}
