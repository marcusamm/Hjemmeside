import { createFileRoute } from "@tanstack/react-router";

// GET /auth/logout
// Clears the session cookie and returns home.
export const Route = createFileRoute("/auth/logout")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { clearSessionUser } = await import("@/lib/auth.server");
          await clearSessionUser();
        } catch (err) {
          console.error("Logout failed:", err);
        }
        return new Response(null, {
          status: 302,
          headers: { Location: "/" },
        });
      },
    },
  },
});
