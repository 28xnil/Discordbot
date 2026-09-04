import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const config = {
  version: '0.8.0',
  token: required('DISCORD_TOKEN'),
  clientId: required('DISCORD_CLIENT_ID'),
  guildId: process.env.DISCORD_GUILD_ID,
  databaseUrl: process.env.DATABASE_URL,
  port: Number(process.env.PORT ?? 9090),
  ownerId: '1019208986165248020',
  oauthClientSecret: process.env.DISCORD_OAUTH_CLIENT_SECRET,
  sessionSecret: process.env.DASHBOARD_SESSION_SECRET ?? 'change-this-dashboard-secret',
  dashboardUrl: process.env.DASHBOARD_URL
    ?? (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : `http://localhost:${process.env.PORT ?? 9090}`)
};

export function validateRuntimeConfig(): void {
  const missing = [
    !process.env.DATABASE_URL ? 'DATABASE_URL' : undefined,
    !process.env.DISCORD_OAUTH_CLIENT_SECRET ? 'DISCORD_OAUTH_CLIENT_SECRET' : undefined
  ].filter((name): name is string => Boolean(name));
  if (missing.length) {
    throw new Error(`Missing runtime variables: ${missing.join(', ')}. Configure them in Railway Variables or your local .env file.`);
  }
}
