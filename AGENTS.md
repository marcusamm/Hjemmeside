# Project notes

This is a TanStack Start (React + Vite + Nitro) application.

- Routes live in `src/routes` (file-based routing; `routeTree.gen.ts` is generated — don't edit by hand).
- `src/server.ts` / `src/start.ts` wrap SSR with error handling.
- Discord login and role-based access: see `DISCORD_SETUP.md`.

## Commands

- `npm run dev` — start the dev server (http://localhost:3000)
- `npm run build` — production build (Nitro, node-server preset by default)
- `npm run lint` / `npm run format`
