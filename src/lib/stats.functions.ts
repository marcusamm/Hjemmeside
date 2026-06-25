import { createServerFn } from "@tanstack/react-start";
import type { Leaderboard } from "./stats-types";

// Returns the per-player leaderboard aggregated from the last 30 CRCON games.
// All CRCON access happens server-side; only finished numbers reach the client.
export const getLeaderboard = createServerFn({ method: "GET" }).handler(
  async (): Promise<Leaderboard> => {
    const { buildLeaderboard } = await import("./crcon.server");
    return buildLeaderboard(30, 25);
  },
);
