# Sentinel Discord Bot

Current version: `0.5.0`. Check the deployed version at `/version`.

Sentinel is a modular Discord bot for moderation, support tickets, server management, logging, and everyday utilities.

## Phase 1: moderation foundation

This phase includes:

- PostgreSQL persistence for guild settings, warnings, moderation cases, and tickets
- Slash command registration with a development-guild option
- `/ping`, `/help`, `/warn`, `/warnings`, `/clearwarnings`, `/unwarn`
- `/timeout`, `/untimeout`, `/kick`, `/ban`, `/unban`
- Staff-only checks and Discord hierarchy checks
- Automatic escalation from warning points

## Phase 2: tickets and interactive help

- Embed-based help menu with section buttons
- Ticket creation panel with private channel permissions
- Ticket creation, close, reopen, delete, rename, claim, unclaim, and list commands
- Ticket buttons for create, close, and claim
- Persistent ticket ownership, status, and assignment
- Topic select menus for Ingame, Discord, Bug Reports, and General Support
- Custom ticket topics through `/ticket config setting:topics value:"🎮|Ingame,💬|Discord,🐛|Bug Reports,❓|General Support"`

Topic entries use `emoji|name`. Plain names such as `Appeals` are also supported.
Discord custom emoji markup is supported too, for example `<a:robuxcoin:1545456806136910007> GAME THINGS`.

## Phase 4: server logging

- `/logs channel` sets the server event log channel
- `/logs status` displays the current log channel
- Join, leave, ban, and unban events are sent as embeds

## Phase 5: utility commands

- `/botinfo`, `/serverinfo`, `/userinfo`, `/avatar`, and `/banner`
- `/roleinfo`, `/channelinfo`, `/permissions`, and `/membercount`
- `/choose`, `/roll`, `/poll`, and `/remind`
- `/8ball` is intentionally not included

## Management and website

- `/config view` and `/config reset`
- `/role create`, `/role delete`, `/role add`, and `/role remove`
- Hosted dashboard at `/`, with live status at `/api/status`
- Local dashboard port defaults to `9090`; Railway uses its injected `PORT` when configured
- Discord OAuth2 owner login and protected developer controls
- Add, update, delete, and immediately sync custom slash commands from the panel

## Phase 3: configuration and AutoMod

- `/ticket config` for category, staff role, log channel, naming pattern, and per-user ticket limits
- `/automod status`, `/automod enable`, `/automod disable`, `/automod set`, `/automod words`, and `/automod spam`
- Link, invite, excessive-capital, mention-spam, blocked-word, and anti-spam detection
- Automatic moderation action logging when a guild log channel is configured

## Setup

1. Install Node.js 20 or newer and PostgreSQL.
2. Copy `.env.example` to `.env` and fill in the Discord token, client ID, and `DATABASE_URL`.
3. Enable the `Guilds`, `GuildMembers`, `GuildMessages`, and `Message Content` intents in the Discord developer portal.
4. Run `npm install`.
5. Run `npm run sync` to register commands, then `npm run dev`.

Set `DISCORD_GUILD_ID` during development for fast command updates. Without it, commands are registered globally.

## Railway deployment

1. Create a Railway project and add a PostgreSQL service.
2. Deploy this repository as a Railway service.
3. Open the bot service's **Variables** tab, choose **Raw Editor**, and paste this template with your own values:

```dotenv
DISCORD_TOKEN=your_rotated_bot_token
DISCORD_CLIENT_ID=your_application_client_id
DISCORD_GUILD_ID=your_development_guild_id
DATABASE_URL=${{Postgres.DATABASE_URL}}
PORT=9090
DISCORD_OAUTH_CLIENT_SECRET=your_discord_oauth_client_secret
DASHBOARD_SESSION_SECRET=use-a-long-random-secret
DASHBOARD_URL=https://gallant-victory-production.up.railway.app
```

If your PostgreSQL service has a different name, replace `Postgres` with that service name. You can also paste the full PostgreSQL connection URL directly as `DATABASE_URL`.

After deployment, the dashboard will be available at `https://gallant-victory-production.up.railway.app/` when that domain is attached to this service. The dashboard API is available at `/api/status`.
The deployment test page is available at `https://gallant-victory-production.up.railway.app/test`.

In the Discord Developer Portal, add this OAuth2 redirect URI to the bot application:

```text
https://gallant-victory-production.up.railway.app/auth/callback
```

The dashboard only accepts Discord user ID `1019208986165248020`. Custom commands created there are stored in PostgreSQL and synced to Discord immediately. Built-in command behavior remains source-controlled; the panel does not execute arbitrary code.

4. Deploy. The bot runs `npm run build`, creates its tables on startup, and starts with `npm start`.

`npm start` automatically synchronizes slash commands before starting the bot. `npm run sync` builds the project and registers commands using compiled JavaScript, so it does not depend on the `tsx` executable shim. Do not use `npm run dev` as the Railway start command.

### Local startup troubleshooting

The PostgreSQL version does not use `DATABASE_PATH`. Your local `.env` must contain:

```dotenv
DATABASE_URL=postgresql://user:password@host:5432/database
DISCORD_OAUTH_CLIENT_SECRET=your_discord_application_client_secret
DASHBOARD_SESSION_SECRET=another-long-random-secret
DASHBOARD_URL=http://localhost:9090
```

Variable names are case-sensitive. `client_Secret` and `DATABASE_PATH` are ignored. Never commit or share bot tokens, OAuth secrets, or database URLs; rotate any credential that has been exposed.

## Planned phases

- Phase 2: ticket transcripts, configurable ticket messages, and ticket logs
- Phase 3: moderation logs, configurable punishments, and appeals
- Phase 4: server configuration, welcome/goodbye, roles, logging, and permission overrides
- Phase 5: utility, statistics, polls, reminders, community, and developer commands
