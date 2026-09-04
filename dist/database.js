import pg from 'pg';
import { config } from './config.js';
const { Pool } = pg;
export const pool = new Pool({
    ...(config.databaseUrl ? { connectionString: config.databaseUrl, ssl: config.databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false } } : {}),
    max: 5
});
const defaultTicketConfig = { namingPattern: 'ticket-{username}', userLimit: 1, topics: ['🎮|Ingame', '💬|Discord', '🐛|Bug Reports', '❓|General Support'] };
const defaultAutoMod = { enabled: false, blockLinks: false, blockInvites: true, blockCaps: false, blockMentions: true, spamLimit: 5, blockedWords: [] };
export async function initializeDatabase() {
    if (!config.databaseUrl)
        throw new Error('Missing DATABASE_URL. Add a PostgreSQL connection string before starting the bot.');
    await pool.query(`
    CREATE TABLE IF NOT EXISTS guild_settings (
      guild_id TEXT PRIMARY KEY,
      settings JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS moderation_cases (
      id BIGSERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      type TEXT NOT NULL,
      reason TEXT NOT NULL,
      points INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS moderation_cases_guild_user_idx ON moderation_cases(guild_id, user_id);
    CREATE TABLE IF NOT EXISTS tickets (
      id BIGSERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL,
      topic TEXT,
      claimed_by TEXT,
      status TEXT NOT NULL DEFAULT 'OPEN',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      closed_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS tickets_guild_status_idx ON tickets(guild_id, status);
  `);
}
function caseFromRow(row) {
    return { id: Number(row.id), guildId: String(row.guild_id), userId: String(row.user_id), moderatorId: String(row.moderator_id), type: row.type, reason: String(row.reason), points: Number(row.points), createdAt: new Date(String(row.created_at)).toISOString() };
}
function ticketFromRow(row) {
    return { id: Number(row.id), guildId: String(row.guild_id), channelId: String(row.channel_id), userId: String(row.user_id), topic: row.topic ? String(row.topic) : undefined, claimedBy: row.claimed_by ? String(row.claimed_by) : undefined, status: row.status, createdAt: new Date(String(row.created_at)).toISOString(), closedAt: row.closed_at ? new Date(String(row.closed_at)).toISOString() : undefined };
}
export async function addCase(input) {
    const result = await pool.query('INSERT INTO moderation_cases (guild_id, user_id, moderator_id, type, reason, points) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [input.guildId, input.userId, input.moderatorId, input.type, input.reason, input.points]);
    return caseFromRow(result.rows[0]);
}
export async function getCase(id) {
    const result = await pool.query('SELECT * FROM moderation_cases WHERE id = $1', [id]);
    return result.rows[0] ? caseFromRow(result.rows[0]) : undefined;
}
export async function getUserCases(guildId, userId) {
    const result = await pool.query('SELECT * FROM moderation_cases WHERE guild_id = $1 AND user_id = $2 ORDER BY id DESC', [guildId, userId]);
    return result.rows.map(caseFromRow);
}
export async function removeCase(id) {
    const result = await pool.query('DELETE FROM moderation_cases WHERE id = $1', [id]);
    return result.rowCount === 1;
}
export async function totalWarningPoints(guildId, userId) {
    const result = await pool.query("SELECT COALESCE(SUM(points), 0) AS points FROM moderation_cases WHERE guild_id = $1 AND user_id = $2 AND type = 'WARN'", [guildId, userId]);
    return Number(result.rows[0].points);
}
export async function ensureGuild(guildId) {
    await pool.query('INSERT INTO guild_settings (guild_id) VALUES ($1) ON CONFLICT (guild_id) DO NOTHING', [guildId]);
}
async function getGuildSettings(guildId) {
    await ensureGuild(guildId);
    const result = await pool.query('SELECT settings FROM guild_settings WHERE guild_id = $1', [guildId]);
    return (result.rows[0]?.settings ?? {});
}
async function updateGuildSettings(guildId, changes) {
    const current = await getGuildSettings(guildId);
    await pool.query('UPDATE guild_settings SET settings = $2::jsonb, updated_at = NOW() WHERE guild_id = $1', [guildId, JSON.stringify({ ...current, ...changes })]);
}
export async function getLogChannel(guildId) {
    return (await getGuildSettings(guildId)).logChannelId;
}
export async function setLogChannel(guildId, channelId) {
    await updateGuildSettings(guildId, { logChannelId: channelId });
}
export async function getTicketConfig(guildId) {
    return { ...defaultTicketConfig, ...(await getGuildSettings(guildId)).ticketConfig };
}
export async function updateTicketConfig(guildId, changes) {
    const next = { ...(await getTicketConfig(guildId)), ...changes };
    await updateGuildSettings(guildId, { ticketConfig: next });
    return next;
}
export async function getAutoModConfig(guildId) {
    const current = (await getGuildSettings(guildId)).autoMod;
    return { ...defaultAutoMod, ...current, blockedWords: current?.blockedWords ?? [] };
}
export async function updateAutoModConfig(guildId, changes) {
    const next = { ...(await getAutoModConfig(guildId)), ...changes };
    await updateGuildSettings(guildId, { autoMod: next });
    return next;
}
export async function createTicket(input) {
    const result = await pool.query('INSERT INTO tickets (guild_id, channel_id, user_id, topic, claimed_by) VALUES ($1, $2, $3, $4, $5) RETURNING *', [input.guildId, input.channelId, input.userId, input.topic ?? null, input.claimedBy ?? null]);
    return ticketFromRow(result.rows[0]);
}
export async function getTicketByChannel(channelId) {
    const result = await pool.query('SELECT * FROM tickets WHERE channel_id = $1', [channelId]);
    return result.rows[0] ? ticketFromRow(result.rows[0]) : undefined;
}
export async function getOpenTicketForUser(guildId, userId) {
    const result = await pool.query("SELECT * FROM tickets WHERE guild_id = $1 AND user_id = $2 AND status = 'OPEN' ORDER BY id DESC LIMIT 1", [guildId, userId]);
    return result.rows[0] ? ticketFromRow(result.rows[0]) : undefined;
}
export async function getGuildTickets(guildId, status) {
    const result = await pool.query(status ? 'SELECT * FROM tickets WHERE guild_id = $1 AND status = $2 ORDER BY id DESC' : 'SELECT * FROM tickets WHERE guild_id = $1 ORDER BY id DESC', status ? [guildId, status] : [guildId]);
    return result.rows.map(ticketFromRow);
}
export async function updateTicket(id, changes) {
    const result = await pool.query('UPDATE tickets SET channel_id = COALESCE($2, channel_id), claimed_by = $3, status = COALESCE($4, status), closed_at = $5 WHERE id = $1 RETURNING *', [id, changes.channelId ?? null, changes.claimedBy ?? null, changes.status ?? null, changes.closedAt ?? null]);
    return result.rows[0] ? ticketFromRow(result.rows[0]) : undefined;
}
