import 'dotenv/config';
function required(name) {
    const value = process.env[name];
    if (!value)
        throw new Error(`Missing required environment variable: ${name}`);
    return value;
}
export const config = {
    token: required('DISCORD_TOKEN'),
    clientId: required('DISCORD_CLIENT_ID'),
    guildId: process.env.DISCORD_GUILD_ID,
    databaseUrl: process.env.DATABASE_URL,
    port: Number(process.env.PORT ?? 9090),
    ownerId: '1019208986165248020',
    oauthClientSecret: process.env.DISCORD_OAUTH_CLIENT_SECRET,
    sessionSecret: process.env.DASHBOARD_SESSION_SECRET ?? 'change-this-dashboard-secret',
    dashboardUrl: process.env.DASHBOARD_URL ?? `http://localhost:${process.env.PORT ?? 9090}`
};
