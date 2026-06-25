# Discord Login — Setup Guide

Your site now supports **"Sign in with Discord"**, with access controlled by the
roles people hold in your Discord server. This guide walks you through getting it
running. It takes about 10 minutes.

When you're done, users can click **Sign In**, authorize with Discord, and the
site reads their server roles to decide what they can access (members area,
operation RSVPs, stats, admin panel, etc.).

---

## 1. Create a Discord application

1. Go to the **Discord Developer Portal**: https://discord.com/developers/applications
2. Click **New Application**, name it (e.g. "Objective First Website"), and create it.
3. In the left sidebar open **OAuth2**.
   - Copy the **Client ID** -> this is `DISCORD_CLIENT_ID`.
   - Click **Reset Secret**, copy the value -> this is `DISCORD_CLIENT_SECRET`.

## 2. Add the OAuth redirect URLs

Still under **OAuth2**, find **Redirects** and add one entry per environment.
Each must be your site's address followed by `/auth/discord/callback`:

- Local dev: `http://localhost:3000/auth/discord/callback`
  (replace `3000` with whatever port your dev server prints)
- Production: `https://YOUR-DOMAIN/auth/discord/callback`

Click **Save Changes**. The redirect must match **exactly** (scheme, host, port, path).

## 3. Create a bot and add it to your server

The site uses a bot to read each member's roles.

1. In the left sidebar open **Bot** -> **Reset Token** -> copy it.
   This is `DISCORD_BOT_TOKEN`. (You don't need any privileged "intents" for this.)
2. Add the bot to your server. Open this URL in a browser, replacing
   `YOUR_CLIENT_ID`:

   ```
   https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&scope=bot&permissions=0
   ```

   Pick your server and authorize. The bot needs no special permissions — it only
   reads membership and roles.

## 4. Get your server (guild) ID

1. In Discord: **User Settings -> Advanced -> Developer Mode = ON**.
2. Right-click your **server icon** -> **Copy Server ID**.
   This is `DISCORD_GUILD_ID`.

## 5. Create a session secret

This encrypts the login cookie. Generate a long random string:

```
openssl rand -base64 48
```

Copy the output -> this is `DISCORD_SESSION_SECRET` (must be 32+ characters).

## 6. Fill in your environment variables

Copy `.env.example` to `.env` and paste in the five values:

```
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
DISCORD_BOT_TOKEN=...
DISCORD_GUILD_ID=...
DISCORD_SESSION_SECRET=...
```

- **Local development:** keep them in `.env` (already gitignored).
- **Production (Lovable / your host):** add the same variables in your host's
  **Environment Variables / Secrets** settings. Do not ship `.env` to production.

## 7. Map your Discord roles to site permissions

Open **`src/lib/auth-config.ts`** and edit the `ROLE_CAPABILITIES` list so the
role **names** match your server exactly (matching is case-insensitive):

```ts
export const ROLE_CAPABILITIES = [
  { role: "Admin",   grants: ["admin", "manageOps", "members", "rsvp", "stats"] },
  { role: "Officer", grants: ["manageOps", "members", "rsvp", "stats"] },
  { role: "SLB",     grants: ["members", "rsvp", "stats"] },
  { role: "Member",  grants: ["members", "rsvp", "stats"] },
];
```

Capabilities you can hand out:

| Capability  | What it unlocks                                        |
|-------------|--------------------------------------------------------|
| `members`   | The members-only area and its content                  |
| `rsvp`      | RSVP to operations                                     |
| `stats`     | View past-operation performance stats                  |
| `manageOps` | Manage the operations board                            |
| `admin`     | The site admin panel                                   |

A user gets the combined capabilities of every matching role. People with no
matching role can still sign in, but land on an "access pending" screen.

---

## How it works (quick tour)

- **Sign-in button** lives in the header (`AuthControls` in
  `src/components/site/SiteHeader.tsx`).
- **`/login`** — the sign-in page.
- **`/auth/discord/login`** — starts OAuth, redirects to Discord.
- **`/auth/discord/callback`** — Discord returns here; the server exchanges the
  code, reads the user's roles via the bot, and stores an **encrypted** session
  cookie.
- **`/auth/logout`** — clears the session.
- **`/members`** — example protected page; sections appear based on capability.
- **`useAuth()`** (`src/lib/auth-client.ts`) — use anywhere in the UI:

  ```tsx
  const { user, isAuthenticated, can } = useAuth();
  if (can("admin")) { /* show admin stuff */ }
  ```

- To protect a new route, copy the `beforeLoad` guard from
  `src/routes/members.tsx`.

## Testing it

1. Start the dev server (`npm run dev`).
2. Click **Sign In** -> authorize on Discord.
3. You should land on `/members` with your name, avatar, and role chips.
4. Check that the right sections show for your role; sign out from the header.

## Troubleshooting

- **"Invalid redirect URI"** on Discord — the URL in step 2 doesn't exactly match
  where the site is running. Add the exact `origin + /auth/discord/callback`.
- **Signed in but "access pending"** — your Discord role names don't match
  `ROLE_CAPABILITIES`. Fix the names in `src/lib/auth-config.ts`.
- **Roles never show** — the bot isn't in your server, or `DISCORD_GUILD_ID` /
  `DISCORD_BOT_TOKEN` are wrong.
- **Cookie won't stick on localhost** — make sure you're on `http://localhost`,
  not `https://` with an untrusted cert. Secure cookies are auto-disabled on http.

## What still needs a database (next step)

Logging in, reading roles, and gating content all work now with no database.
But features that **store** data — saving RSVPs, recording performance stats, and
editing site content from the admin panel — need somewhere to persist that data.
Those are scaffolded in the members area as "coming soon" and are the natural
next step once you pick a database.
