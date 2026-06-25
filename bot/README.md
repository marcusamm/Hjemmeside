# Objective First — Discord Bot

A standalone [discord.js](https://discord.js.org) bot for the Objective First
community. It runs as its own process, separate from the website.

It does two things:

1. **Slash commands** so members can see what their roles unlock on the site.
2. **Member sync** — greets new members and logs to a channel whenever someone's
   *site access* changes because their Discord roles changed.

It shares one source of truth with the website: the role → capability map in
`../src/lib/auth-config.ts`. Edit the roles there once and both the site and the
bot stay in agreement.

> Note: the website login does **not** depend on this bot running. The site reads
> roles directly from Discord's API using the bot token. This bot adds the live
> in-Discord layer (commands + event reactions) on top.

## Commands

| Command            | Who          | What it does                                            |
| ------------------ | ------------ | ------------------------------------------------------- |
| `/whoami`          | anyone       | Shows your Discord roles and what they unlock on the site |
| `/access <user>`   | officers/admins | Shows another member's roles and site access         |
| `/ping`            | anyone       | Confirms the bot is online                              |

## Setup

### 1. Use the same Discord app as the website

The bot reuses the application, token, and server you set up in the main
`DISCORD_SETUP.md`. You need: the **bot token**, the **application (client) ID**,
and your **server (guild) ID**.

### 2. Enable the privileged "Server Members Intent"

In the **Discord Developer Portal → your app → Bot**, turn on
**Server Members Intent**. The welcome + role-change-sync features need it.

### 3. Configure env

```
cd bot
cp .env.example .env
# then fill in DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID
# (optional) WELCOME_CHANNEL_ID, LOG_CHANNEL_ID, SITE_URL
```

To get channel IDs: enable Developer Mode in Discord, right-click a channel →
**Copy Channel ID**. Leave a channel ID blank to disable that feature.

### 4. Install, register commands, run

```
npm install          # inside the bot/ folder
npm run register     # one-time (and whenever commands change)
npm run dev          # start with auto-reload
```

For production, use `npm start` (e.g. under pm2, systemd, a Docker container, or
any always-on Node host).

## How "sync" works

This bot reacts to live Discord events and posts messages; it doesn't write to the
website's data. The website already re-reads each user's roles from Discord every
time they sign in, so site access is always current at login. The bot's value is
visibility and convenience inside Discord:

- **New member joins** → a welcome message pointing them at the sign-in page.
- **A member's roles change** → if that changes what they can do on the site, the
  bot posts a line in your log channel (e.g. "site access now: members, rsvp").

Deeper, real-time two-way sync (instantly flipping site access, saved RSVPs, stored
stats) would require a shared database — the natural next step.
