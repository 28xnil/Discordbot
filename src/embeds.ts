import { EmbedBuilder } from 'discord.js';

export const colors = {
  brand: 0x5865f2,
  success: 0x57f287,
  warning: 0xfee75c,
  danger: 0xed4245,
  neutral: 0x2b2d31
} as const;

export function createEmbed(title: string, description?: string, color: number = colors.brand): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description ?? null)
    .setTimestamp();
}

export function errorEmbed(description: string): EmbedBuilder {
  return createEmbed('Something went wrong', description, colors.danger);
}
