import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
const databaseDirectory = path.dirname(config.databasePath);
const databaseFile = config.databasePath.replace(/\.sqlite$/, '.json');
fs.mkdirSync(databaseDirectory, { recursive: true });
let store = fs.existsSync(databaseFile)
    ? JSON.parse(fs.readFileSync(databaseFile, 'utf8'))
    : { nextCaseId: 1, nextTicketId: 1, guildSettings: {}, moderationCases: [], tickets: [] };
store.nextTicketId ??= 1;
store.tickets = (store.tickets ?? []).filter((ticket) => Boolean(ticket?.guildId && ticket?.channelId));
function persist() {
    const temporaryFile = `${databaseFile}.tmp`;
    fs.writeFileSync(temporaryFile, JSON.stringify(store, null, 2));
    fs.renameSync(temporaryFile, databaseFile);
}
export function addCase(input) {
    const caseItem = { ...input, id: store.nextCaseId++, createdAt: new Date().toISOString() };
    store.moderationCases.push(caseItem);
    persist();
    return caseItem;
}
export function getCase(id) {
    return store.moderationCases.find((caseItem) => caseItem.id === id);
}
export function getUserCases(guildId, userId) {
    return store.moderationCases.filter((caseItem) => caseItem.guildId === guildId && caseItem.userId === userId).sort((left, right) => right.id - left.id);
}
export function removeCase(id) {
    const initialLength = store.moderationCases.length;
    store.moderationCases = store.moderationCases.filter((caseItem) => caseItem.id !== id);
    if (store.moderationCases.length === initialLength)
        return false;
    persist();
    return true;
}
export function totalWarningPoints(guildId, userId) {
    return getUserCases(guildId, userId).filter((caseItem) => caseItem.type === 'WARN').reduce((total, caseItem) => total + caseItem.points, 0);
}
export function ensureGuild(guildId) {
    if (store.guildSettings[guildId])
        return;
    store.guildSettings[guildId] = {};
    persist();
}
export function getLogChannel(guildId) {
    return store.guildSettings[guildId]?.logChannelId;
}
export function setLogChannel(guildId, channelId) {
    ensureGuild(guildId);
    store.guildSettings[guildId].logChannelId = channelId;
    persist();
}
const defaultTicketConfig = { namingPattern: 'ticket-{username}', userLimit: 1, topics: ['🎮|Ingame', '💬|Discord', '🐛|Bug Reports', '❓|General Support'] };
const defaultAutoMod = { enabled: false, blockLinks: false, blockInvites: true, blockCaps: false, blockMentions: true, spamLimit: 5, blockedWords: [] };
export function getTicketConfig(guildId) {
    return { ...defaultTicketConfig, ...store.guildSettings[guildId]?.ticketConfig };
}
export function updateTicketConfig(guildId, changes) {
    ensureGuild(guildId);
    const next = { ...getTicketConfig(guildId), ...changes };
    store.guildSettings[guildId].ticketConfig = next;
    persist();
    return next;
}
export function getAutoModConfig(guildId) {
    return { ...defaultAutoMod, ...store.guildSettings[guildId]?.autoMod, blockedWords: store.guildSettings[guildId]?.autoMod?.blockedWords ?? [] };
}
export function updateAutoModConfig(guildId, changes) {
    ensureGuild(guildId);
    const next = { ...getAutoModConfig(guildId), ...changes };
    store.guildSettings[guildId].autoMod = next;
    persist();
    return next;
}
export function createTicket(input) {
    const ticket = { ...input, id: store.nextTicketId++, status: 'OPEN', createdAt: new Date().toISOString() };
    store.tickets.push(ticket);
    persist();
    return ticket;
}
export function getTicketByChannel(channelId) {
    return store.tickets.find((ticket) => ticket.channelId === channelId);
}
export function getOpenTicketForUser(guildId, userId) {
    return store.tickets.find((ticket) => ticket.guildId === guildId && ticket.userId === userId && ticket.status === 'OPEN');
}
export function getGuildTickets(guildId, status) {
    return store.tickets.filter((ticket) => ticket.guildId === guildId && (!status || ticket.status === status)).sort((left, right) => right.id - left.id);
}
export function updateTicket(id, changes) {
    const ticket = store.tickets.find((item) => item.id === id);
    if (!ticket)
        return undefined;
    Object.assign(ticket, changes);
    persist();
    return ticket;
}
