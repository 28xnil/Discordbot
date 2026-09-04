import type { ChatInputCommandInteraction, SlashCommandBuilder, SlashCommandOptionsOnlyBuilder, SlashCommandSubcommandsOnlyBuilder } from 'discord.js';

export type Command = {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<unknown>;
};

export type ModerationCaseType = 'WARN' | 'TIMEOUT' | 'KICK' | 'BAN' | 'UNBAN';

export type ModerationCase = {
  id: number;
  guildId: string;
  userId: string;
  moderatorId: string;
  type: ModerationCaseType;
  reason: string;
  points: number;
  createdAt: string;
};

export type TicketStatus = 'OPEN' | 'CLOSED';

export type Ticket = {
  id: number;
  guildId: string;
  channelId: string;
  userId: string;
  topic?: string;
  claimedBy?: string;
  status: TicketStatus;
  createdAt: string;
  closedAt?: string;
};

export type TicketConfig = {
  categoryId?: string;
  staffRoleId?: string;
  logChannelId?: string;
  namingPattern: string;
  userLimit: number;
  topics: string[];
};

export type AutoModConfig = {
  enabled: boolean;
  blockLinks: boolean;
  blockInvites: boolean;
  blockCaps: boolean;
  blockMentions: boolean;
  spamLimit: number;
  blockedWords: string[];
};

export type LogType = 'member_join' | 'member_leave' | 'member_ban' | 'member_unban' | 'ticket_create' | 'ticket_close' | 'automod';
