import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DiscordIcon, SteamIcon } from "./SiteHeader";
import { getServers } from "@/lib/battlemetrics.functions";

const FOOTER_SERVER_IDS = ["38460828"];


export function SiteFooter() {
  const { data } = useQuery({
    queryKey: ["battlemetrics", "servers", FOOTER_SERVER_IDS],
    queryFn: () => getServers({ data: { ids: FOOTER_SERVER_IDS } }),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
  const liveServers = data?.servers ?? [];
  return (

    <footer className="relative border-t hairline bg-card/40">
      <div className="grid-tactical absolute inset-0 opacity-40" />
      <div className="relative mx-auto max-w-7xl px-5 py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center border-2 border-khaki bg-olive-deep">
                <span className="stencil text-khaki">OF</span>
              </div>
              <div>
                <div className="stencil text-base">Objective First</div>
                <div className="eyebrow text-[10px] mt-0.5">EST. 2026</div>
              </div>
            </div>
            <p className="mt-5 max-w-xs text-sm text-muted-foreground">
              A disciplined Hell Let Loose community built on teamwork, leadership, and respect for the game.
            </p>
          </div>

          <FooterCol title="Operations">
            <FooterLink to="/" hash="servers">Servers</FooterLink>
            <FooterLink to="/" hash="operations">Operations</FooterLink>
            <FooterLink to="/slb">SLB · Squad Line Battle</FooterLink>
            <FooterLink to="/" hash="recruitment">Recruitment</FooterLink>
          </FooterCol>

          <FooterCol title="Community">
            <FooterLink href="https://discord.gg/obj1st" external>Discord</FooterLink>
            <FooterLink href="https://steamcommunity.com/" external>Steam Group</FooterLink>
            <FooterLink to="/">Code of Conduct</FooterLink>
            <FooterLink to="/">Contact Command</FooterLink>
          </FooterCol>

          <FooterCol title="Server Status · Live">
            {liveServers.length === 0 ? (
              <div className="font-mono text-xs text-muted-foreground">Loading server data…</div>
            ) : (
              liveServers.map((s) => {
                const online = s.status === "online";
                return (
                  <div key={s.id} className="flex items-center gap-2 font-mono text-xs">
                    <span className={`h-2 w-2 rounded-full ${online ? "bg-emerald-500" : "bg-amber-500"}`} />
                    <span className="truncate text-muted-foreground">{s.country} · {s.map}</span>
                    <span className="ml-auto text-khaki">{s.players}/{s.maxPlayers}</span>
                  </div>
                );
              })
            )}
            <a href="https://www.battlemetrics.com/servers/hll/38460828" target="_blank" rel="noreferrer" className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground hover:text-khaki">
              View on BattleMetrics →
            </a>
          </FooterCol>

        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t hairline pt-6 md:flex-row md:items-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            © {new Date().getFullYear()} Objective First · All ranks reserved
          </p>
          <div className="flex items-center gap-3">
            <a href="https://discord.gg/obj1st" aria-label="Discord" className="border hairline p-2 text-muted-foreground transition-colors hover:text-khaki">
              <DiscordIcon className="h-4 w-4" />
            </a>
            <a href="https://steamcommunity.com/" aria-label="Steam" className="border hairline p-2 text-muted-foreground transition-colors hover:text-khaki">
              <SteamIcon className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="eyebrow mb-4">{title}</h4>
      <div className="flex flex-col gap-2.5">{children}</div>
    </div>
  );
}

function FooterLink(props: { to?: string; hash?: string; href?: string; external?: boolean; children: React.ReactNode }) {
  const cls = "text-sm text-muted-foreground transition-colors hover:text-khaki";
  if (props.href) {
    return <a href={props.href} className={cls} target={props.external ? "_blank" : undefined} rel={props.external ? "noreferrer" : undefined}>{props.children}</a>;
  }
  return <Link to={props.to!} hash={props.hash} className={cls}>{props.children}</Link>;
}
