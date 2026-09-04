import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import type { AutoModConfig, ModerationCase, ModerationCaseType, Ticket, TicketConfig } from './types.js';

type GuildSettings = {
  logChannelId?: string;
  ticketConfig?: TicketConfig;
  autoMod?: AutoModConfig;
};

type DatabaseFile = {
  nextCaseId: number;
  nextTicketId: number;
  guildSettings: Record<string, GuildSettings>;
  moderationCases: ModerationCase[];
  tickets: Ticket[];
};

const databaseDirectory = path.dirname(config.databasePath);
const databaseFile = config.databasePath.replace(/\.sqlite$/, '.json');
fs.mkdirSync(databaseDirectory, { recursive: true });

let store: DatabaseFile = fs.existsSync(databaseFile)
  ? JSON.parse(fs.readFileSync(databaseFile, 'utf8')) as DatabaseFile
  : { nextCaseId: 1, nextTicketId: 1, guildSettings: {}, moderationCases: [], tickets: [] };

store.nextTicketId ??= 1;
store.tickets = (store.tickets ?? []).filter((ticket) => Boolean(ticket?.guildId && ticket?.channelId));

function persist(): void {
  const temporaryFile = `${databaseFile}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(store, null, 2));
  fs.renameSync(temporaryFile, databaseFile);
}

export function addCase(input: Omit<ModerationCase, 'id' | 'createdAt'>): ModerationCase {
  const caseItem: ModerationCase = { ...input, id: store.nextCaseId++, createdAt: new Date().toISOString() };
  store.moderationCases.push(caseItem);
  persist();
  return caseItem;
}

export function getCase(id: number): ModerationCase | undefined {
  return store.moderationCases.find((caseItem) => caseItem.id === id);
}

export function getUserCases(guildId: string, userId: string): ModerationCase[] {
  return store.moderationCases.filter((caseItem) => caseItem.guildId === guildId && caseItem.userId === userId).sort((left, right) => right.id - left.id);
}

export function removeCase(id: number): boolean {
  const initialLength = store.moderationCases.length;
  store.moderationCases = store.moderationCases.filter((caseItem) => caseItem.id !== id);
  if (store.moderationCases.length === initialLength) return false;
  persist();
  return true;
}

export function totalWarningPoints(guildId: string, userId: string): number {
  return getUserCases(guildId, userId).filter((caseItem) => caseItem.type === 'WARN').reduce((total, caseItem) => total + caseItem.points, 0);
}

export function ensureGuild(guildId: string): void {
  if (store.guildSettings[guildId]) return;
  store.guildSettings[guildId] = {};
  persist();
}

export function getLogChannel(guildId: string): string | undefined {
  return store.guildSettings[guildId]?.logChannelId;
}

export function setLogChannel(guildId: string, channelId: string): void {
  ensureGuild(guildId);
  store.guildSettings[guildId].logChannelId = channelId;
  persist();
}

const defaultTicketConfig: TicketConfig = { namingPattern: 'ticket-{username}', userLimit: 1, topics: ['🎮|Ingame', '💬|Discord', '🐛|Bug Reports', '❓|General Support'] };
const defaultAutoMod: AutoModConfig = { enabled: false, blockLinks: false, blockInvites: true, blockCaps: false, blockMentions: true, spamLimit: 5, blockedWords: [] };

export function getTicketConfig(guildId: string): TicketConfig {
  return { ...defaultTicketConfig, ...store.guildSettings[guildId]?.ticketConfig };
}

export function updateTicketConfig(guildId: string, changes: Partial<TicketConfig>): TicketConfig {
  ensureGuild(guildId);
  const next = { ...getTicketConfig(guildId), ...changes };
  store.guildSettings[guildId].ticketConfig = next;
  persist();
  return next;
}

export function getAutoModConfig(guildId: string): AutoModConfig {
  return { ...defaultAutoMod, ...store.guildSettings[guildId]?.autoMod, blockedWords: store.guildSettings[guildId]?.autoMod?.blockedWords ?? [] };
}

export function updateAutoModConfig(guildId: string, changes: Partial<AutoModConfig>): AutoModConfig {
  ensureGuild(guildId);
  const next = { ...getAutoModConfig(guildId), ...changes };
  store.guildSettings[guildId].autoMod = next;
  persist();
  return next;
}

export function createTicket(input: Omit<Ticket, 'id' | 'createdAt' | 'status'>): Ticket {
  const ticket: Ticket = { ...input, id: store.nextTicketId++, status: 'OPEN', createdAt: new Date().toISOString() };
  store.tickets.push(ticket);
  persist();
  return ticket;
}

export function getTicketByChannel(channelId: string): Ticket | undefined {
  return store.tickets.find((ticket) => ticket.channelId === channelId);
}

export function getOpenTicketForUser(guildId: string, userId: string): Ticket | undefined {
  return store.tickets.find((ticket) => ticket.guildId === guildId && ticket.userId === userId && ticket.status === 'OPEN');
}

export function getGuildTickets(guildId: string, status?: Ticket['status']): Ticket[] {
  return store.tickets.filter((ticket) => ticket.guildId === guildId && (!status || ticket.status === status)).sort((left, right) => right.id - left.id);
}

export function updateTicket(id: number, changes: Partial<Pick<Ticket, 'channelId' | 'claimedBy' | 'status' | 'closedAt'>>): Ticket | undefined {
  const ticket = store.tickets.find((item) => item.id === id);
  if (!ticket) return undefined;
  Object.assign(ticket, changes);
  persist();
  return ticket;
}

export type { ModerationCaseType };
