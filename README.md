# Sentinel Discord Bot

Sentinel is a modular Discord bot for moderation, support tickets, server management, logging, and everyday utilities.

## Phase 1: moderation foundation

This phase includes:

- Durable JSON persistence for guild settings, warnings, and moderation cases
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

## Phase 3: configuration and AutoMod

- `/ticket config` for category, staff role, log channel, naming pattern, and per-user ticket limits
- `/automod status`, `/automod enable`, `/automod disable`, `/automod set`, `/automod words`, and `/automod spam`
- Link, invite, excessive-capital, mention-spam, blocked-word, and anti-spam detection
- Automatic moderation action logging when a guild log channel is configured

## Setup

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env` and fill in the Discord token and client ID.
3. Enable the `Guilds`, `GuildMembers`, and `MessageContent` intents in the Discord developer portal when later phases require them.
4. Run `npm install`.
5. Run `npm run sync` to register commands, then `npm run dev`.

Set `DISCORD_GUILD_ID` during development for fast command updates. Without it, commands are registered globally.

## Planned phases

- Phase 2: ticket transcripts, configurable ticket messages, and ticket logs
- Phase 3: moderation logs, configurable punishments, and appeals
- Phase 4: server configuration, welcome/goodbye, roles, logging, and permission overrides
- Phase 5: utility, statistics, polls, reminders, community, and developer commands
