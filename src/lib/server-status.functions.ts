import { createServerFn } from "@tanstack/react-start";
import type { ServerStatus } from "./stats-types";

// Live game-server status pulled from CRCON (players, max, current map).
export const getServerStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<ServerStatus | null> => {
    const { getServerStatus: read } = await import("./crcon.server");
    return read();
  },
);
