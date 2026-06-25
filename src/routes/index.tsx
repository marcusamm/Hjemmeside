import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import heroImg from "@/assets/hero-battlefield.jpg";
import frontline1 from "@/assets/frontline-1.png.asset.json";
import frontline2 from "@/assets/frontline-2.png.asset.json";
import frontline3 from "@/assets/frontline-3.jpg.asset.json";
import frontline4 from "@/assets/frontline-4.jpg.asset.json";
import frontline5 from "@/assets/frontline-5.jpg.asset.json";
import commandImg from "@/assets/gallery-command.jpg";
import { SiteHeader, MobileStickyCTA, DiscordIcon } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { getServerStatus } from "@/lib/server-status.functions";
import { getGuildStats } from "@/lib/discord.functions";

const serverStatusQueryOptions = queryOptions({
  queryKey: ["crcon", "serverStatus"],
  queryFn: () => getServerStatus(),
  staleTime: 60_000,
  refetchInterval: 60_000,
});

const guildStatsQueryOptions = queryOptions({
  queryKey: ["discord", "guildStats"],
  queryFn: () => getGuildStats(),
  staleTime: 60_000,
  refetchInterval: 60_000,
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Objective First — Elite Hell Let Loose Community" },
      {
        name: "description",
        content:
          "Join one of the most organized Hell Let Loose communities. Active leadership, structured teamwork, competitive operations, and dedicated servers.",
      },
      { property: "og:title", content: "Objective First — Elite Hell Let Loose Community" },
      {
        property: "og:description",
        content:
          "Organized teamwork, active leadership, and competitive Hell Let Loose operations.",
      },
      { property: "og:image", content: heroImg },
      { name: "twitter:image", content: heroImg },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(serverStatusQueryOptions),
      context.queryClient.ensureQueryData(guildStatsQueryOptions),
    ]),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <SiteHeader />
      <Hero />
      <Stats />
      <WhyJoin />
      <Servers />
      <Operations />
      <Gallery />
      <Recruitment />
      <Testimonials />
      <FAQ />
      <SiteFooter />
      <MobileStickyCTA />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative isolate overflow-hidden border-b hairline">
      <img
        src={heroImg}
        alt="Hell Let Loose battlefield at dusk"
        className="absolute inset-0 h-full w-full object-cover opacity-55"
        width={1920}
        height={1280}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />
      <div className="absolute inset-0 grid-tactical opacity-30" />

      <div className="relative mx-auto max-w-7xl px-5 pt-20 pb-28 md:pt-32 md:pb-40">
        <div className="flex items-center gap-4">
          <span className="h-px w-12 bg-khaki" />
          <span className="eyebrow">ENLISTMENT OPEN</span>
        </div>

        <h1 className="mt-6 max-w-4xl text-5xl leading-[0.95] text-foreground sm:text-6xl md:text-7xl lg:text-8xl">
          Fight with the <span className="text-khaki">best</span>
          <br />
          Hell Let Loose
          <br />
          community.
        </h1>

        <p className="mt-7 max-w-xl text-base text-muted-foreground md:text-lg">
          We run organized teamwork, active leadership, and competitive nights. If you want Hell Let
          Loose played the way it's meant to be played, with people who actually talk to each other,
          come find us.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-4">
          <a
            href="https://discord.gg/obj1st"
            className="group inline-flex items-center gap-3 border-2 border-khaki bg-khaki px-6 py-3.5 font-mono text-xs font-bold uppercase tracking-[0.25em] text-background transition-all hover:bg-transparent hover:text-khaki"
          >
            <DiscordIcon className="h-4 w-4" />
            Join Discord
          </a>
          <Link
            to="/"
            hash="servers"
            className="inline-flex items-center gap-3 border-2 border-foreground/30 bg-transparent px-6 py-3.5 font-mono text-xs font-bold uppercase tracking-[0.25em] text-foreground transition-colors hover:border-khaki hover:text-khaki"
          >
            View Servers →
          </Link>
        </div>

        <div className="mt-16 grid max-w-3xl grid-cols-2 gap-px border hairline bg-border/40 sm:grid-cols-4">
          {[
            ["2026", "Founded"],
            ["1", "Dedicated Server"],
            ["4", "Ops Per Month"],
            ["24/7", "Command Online"],
          ].map(([v, l]) => (
            <div key={l} className="bg-background/80 px-4 py-4 backdrop-blur">
              <div className="stencil tnum text-2xl text-khaki">{v}</div>
              <div className="eyebrow mt-1 text-[10px]">{l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Stats() {
  const { data: guild } = useSuspenseQuery(guildStatsQueryOptions);
  const { data: server } = useSuspenseQuery(serverStatusQueryOptions);
  const fmt = (n: number | null) => (n == null ? "—" : n.toLocaleString("en-US"));

  const stats = [
    { v: fmt(guild.onlineCount), l: "Members Online" },
    { v: fmt(guild.memberCount), l: "Discord Members" },
    { v: "1", l: "Monthly Operations" },
    { v: server ? String(server.players) : "—", l: "Players In-Game" },
    { v: "2026", l: "Founded" },
  ];
  return (
    <section className="border-b hairline bg-card/30">
      <div className="mx-auto max-w-7xl px-5 py-10">
        <div className="grid grid-cols-2 gap-y-8 sm:grid-cols-3 md:grid-cols-5">
          {stats.map((s) => (
            <div key={s.l} className="flex flex-col items-start border-l-2 border-khaki/60 pl-4">
              <div className="tnum font-display text-3xl font-bold text-foreground md:text-4xl">
                {s.v}
              </div>
              <div className="eyebrow mt-1 text-[10px]">{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionHeader({
  index,
  eyebrow,
  title,
  sub,
}: {
  index: string;
  eyebrow: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs tracking-[0.3em] text-khaki">[{index}]</span>
          <span className="eyebrow">{eyebrow}</span>
        </div>
        <h2 className="mt-3 text-4xl md:text-5xl">{title}</h2>
      </div>
      {sub && <p className="max-w-md text-sm text-muted-foreground">{sub}</p>}
    </div>
  );
}

function WhyJoin() {
  const items = [
    {
      n: "01",
      t: "Experienced Leadership",
      d: "Veteran officers run every op. Clear comms, clear orders, no chaos.",
    },
    {
      n: "02",
      t: "Structured Teamwork",
      d: "Squad doctrine, role specialization, and tactics that actually win games.",
    },
    {
      n: "03",
      t: "Active Community",
      d: "Voice-active members and a Discord that never sleeps.",
    },
    {
      n: "04",
      t: "Competitive Events",
      d: "Weekly scrims, monthly campaigns, and a thriving SLB competitive program.",
    },
    {
      n: "05",
      t: "New Player Training",
      d: "Dedicated trainers run weekly bootcamps. Show up. Learn. Promote.",
    },
    {
      n: "06",
      t: "Dedicated Server",
      d: "Our own high-tickrate EU server, built for organized play. Always ours.",
    },
  ];
  return (
    <section className="relative border-b hairline">
      <div className="mx-auto max-w-7xl px-5 py-24">
        <SectionHeader
          index="01"
          eyebrow="OPERATIONAL DOCTRINE"
          title="Why enlist with us"
          sub="We aren't a casual clan. We're a structured community where teamwork is the standard, not the exception."
        />
        <div className="grid gap-px border hairline bg-border/40 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((i) => (
            <div
              key={i.n}
              className="group relative bg-card p-7 transition-colors hover:bg-card/60"
            >
              <div className="stencil text-xs text-khaki/70">{i.n}</div>
              <h3 className="mt-4 text-xl text-foreground">{i.t}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{i.d}</p>
              <div className="absolute right-6 top-6 h-px w-8 bg-khaki/40 transition-all group-hover:w-12" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Servers() {
  const { data: server } = useSuspenseQuery(serverStatusQueryOptions);
  const pct = server
    ? Math.min(100, Math.round((server.players / Math.max(1, server.maxPlayers)) * 100))
    : 0;
  return (
    <section id="servers" className="relative border-b hairline bg-card/20">
      <div className="mx-auto max-w-7xl px-5 py-24">
        <SectionHeader
          index="02"
          eyebrow="ACTIVE SERVER · LIVE"
          title="Dedicated. Populated. Ours."
          sub="Live population pulled straight from our game server. Refreshed every minute."
        />
        {!server ? (
          <div className="border hairline bg-card p-10 text-center font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">
            Server data temporarily unavailable · Try again shortly
          </div>
        ) : (
          <div className="border hairline bg-card p-7 md:max-w-2xl">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                Official
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${server.online ? "bg-emerald-500" : "bg-amber-500"}`}
                />
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  {server.online ? "online" : "offline"}
                </span>
              </div>
            </div>
            <h3 className="mt-4 line-clamp-2 text-lg text-foreground">{server.name}</h3>

            <div className="mt-5 space-y-3 border-t hairline pt-4">
              <Row label="Population" value={`${server.players}/${server.maxPlayers}`} highlight />
              <Row label="Current Map" value={server.map} />
            </div>

            <div className="mt-5">
              <div className="h-1.5 w-full overflow-hidden bg-border/60">
                <div className="h-full bg-khaki transition-all" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-1 flex justify-between font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
                <span>0</span>
                <span>{server.maxPlayers}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between font-mono text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tnum ${highlight ? "text-khaki" : "text-foreground"}`}>{value}</span>
    </div>
  );
}

function Operations() {
  return (
    <section id="operations" className="relative border-b hairline">
      <div className="mx-auto max-w-7xl px-5 py-24">
        <SectionHeader
          index="03"
          eyebrow="OPERATIONS BOARD"
          title="Upcoming operations"
          sub="The operations board isn't live yet. For now, keep an eye on our Discord."
        />
        <div className="border hairline bg-card p-12 text-center">
          <div className="stencil text-2xl text-khaki/80 md:text-3xl">Still Under Construction</div>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
            We're still building the operations board. Scheduled ops, RSVPs, and briefings will live
            here soon — until then, check our Discord for what's coming up.
          </p>
          <a
            href="https://discord.gg/obj1st"
            className="mt-6 inline-flex items-center gap-2 border-2 border-khaki px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-khaki transition-colors hover:bg-khaki hover:text-background"
          >
            Check Discord →
          </a>
        </div>
      </div>
    </section>
  );
}

function Gallery() {
  const tiles = [
    { src: frontline1.url, label: "FOREST PATROL", span: "md:col-span-2 md:row-span-2" },
    { src: frontline2.url, label: "TRENCH LINE" },
    { src: frontline3.url, label: "VILLAGE ASSAULT" },
    { src: frontline4.url, label: "PLACING OUTPOST", span: "md:col-span-2" },
    { src: frontline5.url, label: "ARMORED RECON", span: "md:col-span-2" },
  ];
  return (
    <section className="relative border-b hairline bg-card/20">
      <div className="mx-auto max-w-7xl px-5 py-24">
        <SectionHeader index="04" eyebrow="FIELD ARCHIVE" title="From the front lines" />
        <div className="grid auto-rows-[200px] grid-cols-2 gap-3 md:auto-rows-[220px] md:grid-cols-4">
          {tiles.map((t) => (
            <div
              key={t.label}
              className={`group relative overflow-hidden border hairline ${t.span ?? ""}`}
            >
              <img
                src={t.src}
                alt={t.label}
                loading="lazy"
                width={1024}
                height={1024}
                className="h-full w-full object-cover grayscale-[20%] transition-all duration-700 group-hover:scale-105 group-hover:grayscale-0"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-khaki">
                  {t.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Recruitment() {
  return (
    <section id="recruitment" className="relative isolate border-b hairline overflow-hidden">
      <img
        src={commandImg}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover opacity-20"
      />
      <div className="absolute inset-0 bg-background/80" />
      <div className="absolute inset-0 grid-tactical opacity-40" />
      <div className="relative mx-auto max-w-7xl px-5 py-28">
        <div className="grid gap-12 md:grid-cols-2">
          <div>
            <div className="eyebrow">[05] · ENLISTMENT</div>
            <h2 className="mt-3 text-4xl md:text-6xl">
              Ready to <span className="text-khaki">enlist?</span>
            </h2>
            <p className="mt-5 max-w-md text-muted-foreground">
              We take people who want to play the game properly. No experience needed: just a
              working mic, a willingness to learn, and respect for the people you play with.
            </p>
            <a
              href="https://discord.gg/obj1st"
              className="mt-8 inline-flex items-center gap-3 border-2 border-khaki bg-khaki px-7 py-4 font-mono text-xs font-bold uppercase tracking-[0.25em] text-background transition-all hover:bg-transparent hover:text-khaki"
            >
              Enlist Today <span aria-hidden>→</span>
            </a>
          </div>

          <div className="border hairline bg-card/70 p-8 backdrop-blur">
            <div className="flex items-center justify-between border-b hairline pb-3">
              <span className="eyebrow">ENLISTMENT REQUIREMENTS</span>
            </div>
            <ul className="mt-5 space-y-4">
              {[
                ["18+", "Adult community, mature comms"],
                ["MIC", "Working microphone is mandatory"],
                ["ACTIVE", "Play at least 1–2 nights per week"],
                ["RESPECT", "Toxicity earns a one-way ticket out"],
                ["TEAM", "Squad-first mentality"],
              ].map(([k, v]) => (
                <li key={k} className="flex items-start gap-4">
                  <span className="mt-0.5 w-16 shrink-0 stencil text-xs text-khaki">{k}</span>
                  <span className="text-sm text-muted-foreground">{v}</span>
                </li>
              ))}
            </ul>
            <div className="mt-7 border-t hairline pt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Process · Discord join → Interview → 2-week trial → Full member
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const quotes = [
    {
      q: "The structure here is real, not just talk. Squads actually hold together when it matters.",
      n: "Halvo",
      r: "Infantry",
    },
    {
      q: "Showed up as a brand new player. Trainers walked me through every role. Now I lead squads.",
      n: "Reyez",
      r: "Squad lead",
    },
    {
      q: "SLB nights are the most fun I've had in this game. Real tactics, real stakes.",
      n: "Brennan",
      r: "SLB roster",
    },
  ];
  return (
    <section className="border-b hairline">
      <div className="mx-auto max-w-7xl px-5 py-24">
        <SectionHeader index="06" eyebrow="FIELD REPORTS" title="From the ranks" />
        <div className="grid gap-px border hairline bg-border/40 md:grid-cols-3">
          {quotes.map((q) => (
            <figure key={q.n} className="bg-card p-8">
              <div className="stencil text-3xl text-khaki/60 leading-none">"</div>
              <blockquote className="mt-3 text-base leading-relaxed text-foreground">
                {q.q}
              </blockquote>
              <figcaption className="mt-6 border-t hairline pt-4">
                <div className="font-display text-sm uppercase tracking-wider text-foreground">
                  {q.n}
                </div>
                <div className="eyebrow mt-1 text-[10px]">{q.r}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const faqs = [
    {
      q: "How do I join?",
      a: "Hop into our Discord, introduce yourself in #recruitment, and a recruiter will run you through a quick interview. From there it's a two-week trial.",
    },
    {
      q: "Do I need a microphone?",
      a: "Yes — non-negotiable. Hell Let Loose is a comms-based game and our entire doctrine depends on voice communication.",
    },
    {
      q: "Is training required?",
      a: "Not required, but highly recommended. Bootcamps run weekly and they're the fastest path from new player to squad lead.",
    },
    {
      q: "Which region are your servers in?",
      a: "We host two EU servers (Frankfurt) and one NA East server (Virginia). All run at 60Hz tickrate.",
    },
    {
      q: "What's SLB?",
      a: "Squad Line Battle — our new competitive program. Curated rosters, scheduled scrims, and league-style matches against other top HLL clans.",
    },
    {
      q: "Is there an age requirement?",
      a: "18+. We're an adult community and our voice comms reflect that — no kids on the front line.",
    },
  ];
  return (
    <section className="border-b hairline bg-card/20">
      <div className="mx-auto max-w-7xl px-5 py-24">
        <SectionHeader index="07" eyebrow="COMMON QUESTIONS" title="FAQ" />
        <div className="border hairline">
          {faqs.map((f, i) => (
            <details
              key={f.q}
              className={`group ${i !== faqs.length - 1 ? "border-b hairline" : ""}`}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 px-6 py-5 transition-colors hover:bg-card/50">
                <div className="flex items-center gap-4">
                  <span className="font-mono text-[10px] text-khaki">
                    [{String(i + 1).padStart(2, "0")}]
                  </span>
                  <span className="text-base text-foreground md:text-lg">{f.q}</span>
                </div>
                <span className="font-mono text-khaki transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <div className="px-6 pb-6 pl-16 text-sm leading-relaxed text-muted-foreground">
                {f.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
