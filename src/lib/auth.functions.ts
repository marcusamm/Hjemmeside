import { createServerFn } from "@tanstack/react-start";
import type { SessionUser } from "./auth-config";

/**
 * Returns the currently logged-in user (read from the encrypted session
 * cookie), or null if nobody is logged in. Safe to call from the client —
 * the actual session read happens on the server.
 */
export const getCurrentUser = createServerFn({ method: "GET" }).handler(
  async (): Promise<SessionUser | null> => {
    const { getSessionUser } = await import("./auth.server");
    return getSessionUser();
  },
);
