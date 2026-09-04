import type { Client, GuildMember, User } from 'discord.js';
import { getLogChannel, getLogTypes } from './database.js';
import { createEmbed, colors } from './embeds.js';

export async function logGuildEvent(guild: GuildMember['guild'], title: string, description: string, color: number = colors.neutral): Promise<void> {
  const channelId = await getLogChannel(guild.id);
  const channel = channelId ? guild.channels.cache.get(channelId) : undefined;
  if (channel?.isTextBased()) await channel.send({ embeds: [createEmbed(title, description, color)] }).catch(() => undefined);
}

async function enabled(guildId: string, type: string): Promise<boolean> {
  return (await getLogTypes(guildId))[type] ?? true;
}

export function registerLogging(client: Client): void {
  client.on('guildMemberAdd', async (member) => { if (await enabled(member.guild.id, 'member_join')) await logGuildEvent(member.guild, 'Member joined', `${member.user} joined the server.`, colors.success); });
  client.on('guildMemberRemove', async (member) => { if (await enabled(member.guild.id, 'member_leave')) await logGuildEvent(member.guild, 'Member left', `${member.user.tag} left the server.`, colors.warning); });
  client.on('guildBanAdd', async (ban) => { if (await enabled(ban.guild.id, 'member_ban')) await logGuildEvent(ban.guild, 'Member banned', `${ban.user.tag} was banned.`, colors.danger); });
  client.on('guildBanRemove', async (ban) => { if (await enabled(ban.guild.id, 'member_unban')) await logGuildEvent(ban.guild, 'Member unbanned', `${ban.user.tag} was unbanned.`, colors.success); });
}

export type { User };