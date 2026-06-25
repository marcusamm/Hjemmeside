import { createServerFn } from "@tanstack/react-start";

export type ServerInfo = {
  id: string;
  name: string;
  map: string;
  players: number;
  maxPlayers: number;
  status: "online" | "offline" | "dead" | "removed" | "invalid" | string;
  country: string;
  rank: number | null;
  updatedAt: string;
};

async function fetchOne(id: string): Promise<ServerInfo | null> {
  try {
    const res = await fetch(`https://api.battlemetrics.com/servers/${id}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: {
        id: string;
        attributes: {
          name: string;
          players: number;
          maxPlayers: number;
          status: string;
          country: string;
          rank: number | null;
          updatedAt: string;
          details?: { map?: string };
        };
      };
    };
    const a = json.data?.attributes;
    if (!a || !json.data) return null;
    return {
      id: json.data.id,
      name: a.name,
      map: a.details?.map ?? "Unknown",
      players: a.players ?? 0,
      maxPlayers: a.maxPlayers ?? 100,
      status: a.status,
      country: a.country,
      rank: a.rank ?? null,
      updatedAt: a.updatedAt,
    };
  } catch {
    return null;
  }
}

export const getServers = createServerFn({ method: "GET" })
  .inputValidator((data: { ids: string[] }) => data)
  .handler(async ({ data }) => {
    const results = await Promise.all(data.ids.map(fetchOne));
    return { servers: results.filter((s): s is ServerInfo => s !== null) };
  });
