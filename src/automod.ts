import { PermissionFlagsBits, type Message } from 'discord.js';
import { getAutoModConfig, getLogChannel } from './database.js';
import { createEmbed, colors } from './embeds.js';

const recentMessages = new Map<string, number[]>();

function isStaff(message: Message): boolean {
  return Boolean(message.member?.permissions.has(PermissionFlagsBits.ManageMessages) || message.member?.permissions.has(PermissionFlagsBits.ManageGuild));
}

function hasExcessiveCaps(content: string): boolean {
  const letters = content.match(/[a-z]/gi) ?? [];
  const uppercase = content.match(/[A-Z]/g) ?? [];
  return letters.length >= 12 && uppercase.length / letters.length >= 0.75;
}

function violation(content: string, settings: ReturnType<typeof getAutoModConfig>): string | undefined {
  const lower = content.toLowerCase();
  if (settings.blockInvites && /(discord\.gg|discord(?:app)?\.com\/invite)\//i.test(content)) return 'Discord invite links are not allowed.';
  if (settings.blockLinks && /https?:\/\//i.test(content)) return 'Links are not allowed here.';
  if (settings.blockCaps && hasExcessiveCaps(content)) return 'Please avoid excessive capital letters.';
  if (settings.blockMentions && (content.match(/<@!?(\d+)>/g)?.length ?? 0) >= 6) return 'Mention spam is not allowed.';
  if (settings.blockedWords.some((word) => word && lower.includes(word))) return 'That message contains a blocked word.';
  return undefined;
}

export async function handleAutoModMessage(message: Message): Promise<void> {
  if (!message.guild || message.author.bot || isStaff(message)) return;
  const settings = getAutoModConfig(message.guild.id);
  if (!settings.enabled) return;

  const key = `${message.guild.id}:${message.author.id}`;
  const now = Date.now();
  const timestamps = (recentMessages.get(key) ?? []).filter((timestamp) => now - timestamp < 10_000);
  timestamps.push(now);
  recentMessages.set(key, timestamps);
  const reason = timestamps.length > settings.spamLimit ? 'You are sending messages too quickly.' : violation(message.content, settings);
  if (!reason) return;

  await message.delete().catch(() => undefined);
  if (timestamps.length > settings.spamLimit) {
    await message.member?.timeout(60_000, 'AutoMod anti-spam').catch(() => undefined);
    recentMessages.delete(key);
  }
  const logChannelId = getLogChannel(message.guild.id);
  const logChannel = logChannelId ? message.guild.channels.cache.get(logChannelId) : undefined;
  if (logChannel?.isTextBased()) await logChannel.send({ embeds: [createEmbed('AutoMod action', `${message.author} message removed.\nReason: ${reason}`, colors.warning)] }).catch(() => undefined);
}
