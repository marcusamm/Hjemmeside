// Client-safe types for the CRCON leaderboard (no logic, no secrets).
export type PlayerRow = {
  playerId: string;
  name: string;
  games: number;
  avgKills: number;
  avgDeaths: number;
  kd: number;
  avgCombat: number;
  avgOffense: number;
  avgDefense: number;
  avgSupport: number;
  hours: number;
};

export type Leaderboard = {
  players: PlayerRow[];
  gamesAnalyzed: number;
  updatedAt: string;
  /** Human-readable diagnostic of the last CRCON fetch (members-only). */
  note?: string;
};

export type ServerStatus = {
  name: string;
  players: number;
  maxPlayers: number;
  map: string;
  online: boolean;
};
