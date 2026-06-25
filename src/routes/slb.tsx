import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, MobileStickyCTA, DiscordIcon } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import commandImg from "@/assets/gallery-command.jpg";

export const Route = createFileRoute("/slb")({
  head: () => ({
    meta: [
      { title: "SLB · Squad Line Battle — Objective First" },
      { name: "description", content: "Squad Line Battle (SLB) — Objective First's new competitive Hell Let Loose program. Curated rosters, structured scrims, league-style matches." },
      { property: "og:title", content: "SLB · Squad Line Battle — Objective First" },
      { property: "og:description", content: "Our new competitive Hell Let Loose league program. Roster up." },
      { property: "og:image", content: commandImg },
    ],
  }),
  component: SLB,
});

function SLB() {
  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <SiteHeader />

      <section className="relative isolate overflow-hidden border-b hairline">
        <img src={commandImg} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
        <div className="absolute inset-0 grid-tactical opacity-30" />
        <div className="relative mx-auto max-w-7xl px-5 pt-20 pb-24 md:pt-28">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center border border-rust/70 bg-rust/15 px-2 py-1 font-mono text-[10px] font-bold tracking-[0.25em] text-rust">
              NEW PROGRAM
            </span>
            <span className="eyebrow">[CLASSIFIED · ROSTER ONLY]</span>
          </div>
          <h1 className="mt-6 text-5xl md:text-7xl lg:text-8xl">
            <span className="text-khaki">SLB</span><br />
            Squad Line<br />
            Battle.
          </h1>
          <p className="mt-7 max-w-xl text-base text-muted-foreground md:text-lg">
            Our new competitive Hell Let Loose league program. Curated rosters, weekly scrims,
            and league-style matches against the strongest clans in HLL.
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <a href="https://discord.gg/yfr7j4WQKe" className="inline-flex items-center gap-3 border-2 border-khaki bg-khaki px-6 py-3.5 font-mono text-xs font-bold uppercase tracking-[0.25em] text-background transition-all hover:bg-transparent hover:text-khaki">
              <DiscordIcon className="h-4 w-4" />
              Apply to Roster
            </a>
            <a href="#format" className="inline-flex items-center border-2 border-foreground/30 px-6 py-3.5 font-mono text-xs font-bold uppercase tracking-[0.25em] text-foreground hover:border-khaki hover:text-khaki">
              Read the Briefing →
            </a>
          </div>
        </div>
      </section>

      <section id="format" className="border-b hairline">
        <div className="mx-auto max-w-7xl px-5 py-20">
          <div className="grid gap-12 md:grid-cols-3">
            {[
              { n: "01", t: "Format", d: "8v8 curated squads. Best-of-three offensive maps. League-tracked seasons." },
              { n: "02", t: "Schedule", d: "Scrims every Sunday 21:00 UTC. Official matches Wednesdays. Off-season in August." },
              { n: "03", t: "Roster", d: "Capped at 24 active players. Try-outs run twice per season. Performance reviewed weekly." },
            ].map((b) => (
              <div key={b.n} className="border hairline p-7">
                <div className="stencil text-xs text-khaki/70">{b.n}</div>
                <h3 className="mt-3 text-2xl">{b.t}</h3>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{b.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b hairline bg-card/20">
        <div className="mx-auto max-w-7xl px-5 py-20">
          <div className="eyebrow">[02] · CURRENT SEASON</div>
          <h2 className="mt-3 text-4xl md:text-5xl">Season 1 · Standings</h2>
          <div className="mt-10 border hairline">
            {[
              ["01", "Objective First", "6–1", "+18"],
              ["02", "Iron Vanguard", "5–2", "+11"],
              ["03", "84th Rifles", "5–2", "+9"],
              ["04", "Bravo Squad", "3–4", "-2"],
              ["05", "Easy Co.", "2–5", "-8"],
            ].map(([rank, name, rec, diff], i, arr) => (
              <div key={name} className={`grid grid-cols-12 items-center px-5 py-4 md:px-7 ${i !== arr.length - 1 ? "border-b hairline" : ""} ${name === "Objective First" ? "bg-khaki/5" : ""}`}>
                <div className="col-span-2 stencil text-khaki">{rank}</div>
                <div className="col-span-6 text-base text-foreground md:text-lg">{name}</div>
                <div className="col-span-2 font-mono text-sm text-muted-foreground">{rec}</div>
                <div className="col-span-2 text-right font-mono text-sm text-khaki">{diff}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
      <MobileStickyCTA />
    </div>
  );
}
