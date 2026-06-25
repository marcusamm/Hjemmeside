import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader, MobileStickyCTA } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { currentUserQueryOptions } from "@/lib/auth-client";
import { getLeaderboard } from "@/lib/stats.functions";

const leaderboardQueryOptions = queryOptions({
  queryKey: ["crcon", "leaderboard"],
  queryFn: () => getLeaderboard(),
  staleTime: 5 * 60_000,
  refetchInterval: 5 * 60_000,
});

export const Route = createFileRoute("/stats")({
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(currentUserQueryOptions);
    if (!user) throw redirect({ to: "/login" });
    if (!user.capabilities.includes("stats")) throw redirect({ to: "/members" });
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(leaderboardQueryOptions),
  head: () => ({ meta: [{ title: "Performance Stats — Objective First" }] }),
  component: StatsPage,
});

function n1(x: number): string {
  return x.toLocaleString("en-US", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
}

function StatsPage() {
  const { data } = useSuspenseQuery(leaderboardQueryOptions);

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <SiteHeader />

      <section className="border-b hairline">
        <div className="mx-auto max-w-7xl px-5 pt-16 pb-10">
          <div className="flex items-center gap-3">
            <span className="h-px w-12 bg-khaki" />
            <span className="eyebrow">RESTRICTED · PERFORMANCE</span>
          </div>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-5xl">Leaderboard</h1>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Averages across the last {data.gamesAnalyzed || 30} games, pulled from our game
                server. Ranked by average kills.
              </p>
            </div>
            <Link
              to="/members"
              className="inline-flex items-center border-2 border-foreground/30 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-foreground transition-colors hover:border-khaki hover:text-khaki"
            >
              ← Members
            </Link>
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-7xl px-5 py-12">
          {data.players.length === 0 ? (
            <div className="border hairline bg-card p-8">
              <h2 className="text-xl text-foreground">No stats yet</h2>
              <p className="mt-3 max-w-lg text-sm text-muted-foreground">
                The game server didn't return any games. Here's exactly what happened when the site
                tried to read it (screenshot this and send it over):
              </p>
              <pre className="mt-4 overflow-x-auto border hairline bg-background/60 p-4 font-mono text-[11px] leading-relaxed text-khaki">
                {data.note || "no diagnostic available"}
              </pre>
            </div>
          ) : (
            <div className="overflow-x-auto border hairline">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead>
                  <tr className="bg-card/60 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    <th className="px-3 py-3">#</th>
                    <th className="px-3 py-3">Player</th>
                    <th className="px-3 py-3 text-right">Games</th>
                    <th className="px-3 py-3 text-right text-khaki">Kills</th>
                    <th className="px-3 py-3 text-right">Deaths</th>
                    <th className="px-3 py-3 text-right">K/D</th>
                    <th className="px-3 py-3 text-right">CBT</th>
                    <th className="px-3 py-3 text-right">OFF</th>
                    <th className="px-3 py-3 text-right">DEF</th>
                    <th className="px-3 py-3 text-right">SUP</th>
                    <th className="px-3 py-3 text-right">Hrs</th>
                  </tr>
                </thead>
                <tbody>
                  {data.players.map((p, i) => (
                    <tr
                      key={p.playerId}
                      className={`border-t hairline transition-colors hover:bg-card/40 ${i % 2 ? "bg-card/20" : ""}`}
                    >
                      <td
                        className={`px-3 py-2.5 stencil ${i === 0 ? "text-khaki" : i === 1 ? "text-foreground" : i === 2 ? "text-rust" : "text-khaki/50"}`}
                      >
                        {i + 1}
                      </td>
                      <td className="max-w-[220px] truncate px-3 py-2.5 text-foreground">
                        {p.name}
                      </td>
                      <td className="tnum px-3 py-2.5 text-right text-muted-foreground">
                        {p.games}
                      </td>
                      <td className="tnum px-3 py-2.5 text-right font-bold text-khaki">
                        {n1(p.avgKills)}
                      </td>
                      <td className="tnum px-3 py-2.5 text-right text-muted-foreground">
                        {n1(p.avgDeaths)}
                      </td>
                      <td className="tnum px-3 py-2.5 text-right text-foreground">{n1(p.kd)}</td>
                      <td className="tnum px-3 py-2.5 text-right text-muted-foreground">
                        {n1(p.avgCombat)}
                      </td>
                      <td className="tnum px-3 py-2.5 text-right text-muted-foreground">
                        {n1(p.avgOffense)}
                      </td>
                      <td className="tnum px-3 py-2.5 text-right text-muted-foreground">
                        {n1(p.avgDefense)}
                      </td>
                      <td className="tnum px-3 py-2.5 text-right text-muted-foreground">
                        {n1(p.avgSupport)}
                      </td>
                      <td className="tnum px-3 py-2.5 text-right text-muted-foreground">
                        {n1(p.hours)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            CBT combat · OFF offense · DEF defense · SUP support · refreshed every 15 min
          </p>
        </div>
      </section>

      <SiteFooter />
      <MobileStickyCTA />
    </div>
  );
}
