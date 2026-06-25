import { createFileRoute, redirect } from "@tanstack/react-router";
import { SiteHeader, MobileStickyCTA, DiscordIcon } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { currentUserQueryOptions } from "@/lib/auth-client";

type LoginSearch = { error?: string };

const ERROR_MESSAGES: Record<string, string> = {
  state: "Your login session expired or didn't match. Please try again.",
  oauth: "We couldn't complete the Discord sign-in. Please try again.",
  denied: "Discord authorization was cancelled.",
  config: "Discord login isn't set up yet — add your credentials in .env (see DISCORD_SETUP.md).",
};

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    error: typeof search.error === "string" ? search.error : undefined,
  }),
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(currentUserQueryOptions);
    if (user) {
      throw redirect({ to: "/members" });
    }
  },
  head: () => ({
    meta: [
      { title: "Sign In — Objective First" },
      {
        name: "description",
        content: "Sign in with Discord to access the Objective First members area.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { error } = Route.useSearch();
  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <SiteHeader />

      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 grid-tactical opacity-30" />
        <div className="relative mx-auto flex max-w-xl flex-col px-5 pt-20 pb-28 md:pt-28">
          <div className="flex items-center gap-3">
            <span className="h-px w-12 bg-khaki" />
            <span className="eyebrow">SECURE CHANNEL · ACCESS CONTROL</span>
          </div>
          <h1 className="mt-6 text-4xl md:text-6xl">
            Sign in to <span className="text-khaki">command</span>
          </h1>
          <p className="mt-5 text-muted-foreground">
            Authenticate with Discord. Your access on the site is determined by the roles you hold
            in our Discord server.
          </p>

          {error && (
            <div className="mt-6 border border-destructive/60 bg-destructive/10 px-4 py-3 font-mono text-xs uppercase tracking-[0.18em] text-destructive">
              {ERROR_MESSAGES[error] ?? "Something went wrong. Please try again."}
            </div>
          )}

          <a
            href="/auth/discord/login"
            className="mt-8 inline-flex items-center justify-center gap-3 border-2 border-khaki bg-khaki px-7 py-4 font-mono text-xs font-bold uppercase tracking-[0.25em] text-background transition-all hover:bg-transparent hover:text-khaki"
          >
            <DiscordIcon className="h-4 w-4" />
            Sign in with Discord
          </a>

          <div className="mt-12 border hairline bg-card/60 p-6">
            <div className="flex items-center justify-between border-b hairline pb-3">
              <span className="eyebrow">WHAT YOUR ROLE UNLOCKS</span>
              <span className="font-mono text-[10px] text-muted-foreground">CLEARANCE</span>
            </div>
            <ul className="mt-5 space-y-4 text-sm text-muted-foreground">
              <li className="flex items-start gap-4">
                <span className="mt-0.5 w-20 shrink-0 stencil text-xs text-khaki">MEMBER</span>
                <span>Members-only briefings, operation RSVPs, and performance stats.</span>
              </li>
              <li className="flex items-start gap-4">
                <span className="mt-0.5 w-20 shrink-0 stencil text-xs text-khaki">OFFICER</span>
                <span>Everything members get, plus managing the operations board.</span>
              </li>
              <li className="flex items-start gap-4">
                <span className="mt-0.5 w-20 shrink-0 stencil text-xs text-khaki">ADMIN</span>
                <span>Full access, including the site admin panel.</span>
              </li>
            </ul>
            <div className="mt-6 border-t hairline pt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Not in the server yet? Join Discord first, then sign in.
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
      <MobileStickyCTA />
    </div>
  );
}
