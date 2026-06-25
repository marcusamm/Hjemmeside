import { createServerFn } from "@tanstack/react-start";
import type { PlayerRow } from "./stats-types";

export type MyStats =
  | { status: "not_member" }
  | { status: "no_steam" }
  | { status: "no_data"; steamId: string }
  | { status: "ok"; steamId: string; player: PlayerRow };

// Resolves the logged-in member's own CRCON stats:
//   session -> Discord id -> Steam id (from the Discord channel) -> CRCON stats.
export const getMyStats = createServerFn({ method: "GET" }).handler(async (): Promise<MyStats> => {
  const { getSessionUser } = await import("./auth.server");
  const user = await getSessionUser();
  if (!user || !user.isMember) return { status: "not_member" };

  const { getSteamIdForDiscordUser } = await import("./steam-link.server");
  const steamId = await getSteamIdForDiscordUser(user.id);
  if (!steamId) return { status: "no_steam" };

  const { getPlayerStats } = await import("./crcon.server");
  const player = await getPlayerStats(steamId);
  if (!player) return { status: "no_data", steamId };
  return { status: "ok", steamId, player };
});
