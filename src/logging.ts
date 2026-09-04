import type { Client, GuildMember, User } from 'discord.js';
import { getLogChannel } from './database.js';
import { createEmbed, colors } from './embeds.js';

export async function logGuildEvent(guild: GuildMember['guild'], title: string, description: string, color: number = colors.neutral): Promise<void> {
  const channelId = await getLogChannel(guild.id);
  const channel = channelId ? guild.channels.cache.get(channelId) : undefined;
  if (channel?.isTextBased()) await channel.send({ embeds: [createEmbed(title, description, color)] }).catch(() => undefined);
}

export function registerLogging(client: Client): void {
  client.on('guildMemberAdd', (member) => logGuildEvent(member.guild, 'Member joined', `${member.user} joined the server.`, colors.success));
  client.on('guildMemberRemove', (member) => logGuildEvent(member.guild, 'Member left', `${member.user.tag} left the server.`, colors.warning));
  client.on('guildBanAdd', (ban) => logGuildEvent(ban.guild, 'Member banned', `${ban.user.tag} was banned.`, colors.danger));
  client.on('guildBanRemove', (ban) => logGuildEvent(ban.guild, 'Member unbanned', `${ban.user.tag} was unbanned.`, colors.success));
}

export type { User };