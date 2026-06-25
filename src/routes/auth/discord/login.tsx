import { createFileRoute } from "@tanstack/react-router";

// GET /auth/discord/login
// Starts the Discord OAuth flow: sets a short-lived CSRF state cookie and
// redirects the browser to Discord's authorize screen. If the Discord
// environment variables aren't set yet, redirects to /login with a notice
// instead of throwing a 500.
export const Route = createFileRoute("/auth/discord/login")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { buildAuthorizeUrl } = await import("@/lib/auth.server");
          const { setCookie, getRequestProtocol } = await import("@tanstack/react-start/server");

          let secure = true;
          try {
            secure = getRequestProtocol() === "https";
          } catch {
            secure = true;
          }

          const state = crypto.randomUUID();
          setCookie("discord_oauth_state", state, {
            httpOnly: true,
            sameSite: "lax",
            secure,
            path: "/",
            maxAge: 600, // 10 minutes
          });

          return new Response(null, {
            status: 302,
            headers: { Location: buildAuthorizeUrl(state) },
          });
        } catch (err) {
          console.error("Discord login is not configured:", err);
          return new Response(null, {
            status: 302,
            headers: { Location: "/login?error=config" },
          });
        }
      },
    },
  },
});
