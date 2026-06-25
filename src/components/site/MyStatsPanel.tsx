import { useQuery, queryOptions } from "@tanstack/react-query";
import { getMyStats } from "@/lib/me-stats.functions";

const myStatsQueryOptions = queryOptions({
  queryKey: ["crcon", "myStats"],
  queryFn: () => getMyStats(),
  staleTime: 5 * 60_000,
});

function n1(x: number): string {
  return x.toLocaleString("en-US", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
}

function Tile({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-background/80 px-4 py-4">
      <div
        className={`tnum font-display text-2xl font-bold md:text-3xl ${highlight ? "text-khaki" : "text-foreground"}`}
      >
        {value}
      </div>
      <div className="eyebrow mt-1 text-[10px]">{label}</div>
    </div>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="border hairline bg-card p-6">
      <div className="flex items-center gap-3">
        <span className="h-px w-10 bg-khaki" />
        <span className="eyebrow">YOUR STATS</span>
      </div>
      <h3 className="mt-3 text-xl text-foreground">{title}</h3>
      <p className="mt-2 max-w-lg text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

export function MyStatsPanel() {
  const { data, isLoading } = useQuery(myStatsQueryOptions);

  if (isLoading || !data) {
    return (
      <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        Loading your stats…
      </div>
    );
  }

  if (data.status === "not_member") {
    return (
      <Notice
        title="Whoops — you're not a member yet"
        body="Head over to our Discord and join up, then come back and sign in to see your stats."
      />
    );
  }
  if (data.status === "no_steam") {
    return (
      <Notice
        title="Link your Steam ID"
        body="We couldn't find your Steam ID. Post your 17-digit Steam64 ID in our Discord steam-id channel and your stats will appear here automatically."
      />
    );
  }
  if (data.status === "no_data") {
    return (
      <Notice
        title="No recent games"
        body="We found your Steam ID, but you don't appear in the last 30 tracked games. Hop on the server and they'll show up here."
      />
    );
  }

  const p = data.player;
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="h-px w-10 bg-khaki" />
        <span className="eyebrow">YOUR STATS · LAST 30 GAMES</span>
      </div>
      <h2 className="mt-3 text-2xl text-foreground md:text-3xl">
        {p.name} <span className="text-muted-foreground">· {p.games} games</span>
      </h2>
      <div className="mt-5 grid grid-cols-2 gap-px border hairline bg-border/40 sm:grid-cols-3 lg:grid-cols-6">
        <Tile label="Avg Kills" value={n1(p.avgKills)} highlight />
        <Tile label="Avg Deaths" value={n1(p.avgDeaths)} />
        <Tile label="K/D" value={n1(p.kd)} />
        <Tile label="Combat" value={n1(p.avgCombat)} />
        <Tile label="Offense" value={n1(p.avgOffense)} />
        <Tile label="Defense" value={n1(p.avgDefense)} />
        <Tile label="Support" value={n1(p.avgSupport)} />
        <Tile label="Hours" value={n1(p.hours)} />
      </div>
    </div>
  );
}
