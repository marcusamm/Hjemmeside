import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

export default defineConfig(({ command, mode }) => {
  // Load ALL vars from .env (no prefix filter) and make them available to
  // server-side code via process.env during dev. These are NOT exposed to the
  // client (we don't put them in `define`), so secrets stay server-only.
  const env = loadEnv(mode, process.cwd(), "");
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }

  return {
    plugins: [
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
      tailwindcss(),
      tanstackStart({
        // Redirect TanStack Start's bundled server entry to src/server.ts.
        server: { entry: "server" },
        importProtection: {
          behavior: "error",
          client: {
            files: ["**/server/**", "**/*.server.*"],
            specifiers: ["server-only"],
          },
        },
      }),
      viteReact(),
      // Nitro produces the deployable server output (build only).
      // Default preset is "node-server". For Cloudflare use nitro({ preset: "cloudflare-module" }).
      ...(command === "build" ? [nitro()] : []),
    ],
    resolve: {
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    server: {
      // Pin the dev port so it always matches the Discord redirect URL.
      port: 3000,
      strictPort: true,
    },
  };
});
