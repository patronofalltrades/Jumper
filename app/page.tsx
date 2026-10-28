import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { BoardArt } from "@/components/art/board-art";
import { Volt } from "@/components/art/volt";
import { Backdrop } from "@/components/backdrop";
import { LandingBoard } from "@/components/landing/landing-board";
import { Logo } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { PlayIcon, WatchButton } from "@/components/walkthrough/watch-button";
import { Button, buttonVariants } from "@/components/ui/button";
import text from "@/content/ui/landing.json";
import watch from "@/content/ui/walkthrough.json";
import { loadBoards } from "@/lib/content/boards";
import { loadIntroClip } from "@/lib/content/clips";
import { loadProjects } from "@/lib/content/load";
import { wiringOrder } from "@/lib/game/landing";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: text.meta.title, description: text.meta.description };

// The landing page for visitors who are not logged in (issue #46). The proxy sends a logged-in user to the lobby.
// The catalog comes from content/projects/, not the database: the content tables are only for logged-in users.
export default async function LandingPage({ searchParams }: PageProps<"/">) {
  const projects = loadProjects();
  const featured = projects.find((p) => p.status === "available");
  const order = featured ? wiringOrder(await loadBoards(featured.slug)) : [];
  const intro = await loadIntroClip();

  return (
    <>
      <Backdrop />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-5 sm:gap-6 sm:px-8 sm:py-8">
        <Suspense>{searchParams.then(({ deleted }) => deleted === "1" && <DeletedNotice />)}</Suspense>
        <header className="flex items-center justify-between gap-3">
          <Logo onDark />
          <nav aria-label="Account" className="flex items-center gap-2">
            <Link href="/login" className="rounded-full px-3 py-2 text-sm font-semibold text-white/85 hover:bg-white/10 hover:text-white">
              {text.logIn}
            </Link>
            <Button asChild>
              <Link href="/signup">{text.signUp}</Link>
            </Button>
          </nav>
        </header>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] sm:gap-6">
          <Panel className="flex flex-col gap-5">
            <p className="font-mono text-xs font-medium tracking-wide text-muted-foreground uppercase">{text.pitch.eyebrow}</p>
            <h1 className="text-4xl leading-[0.98] font-extrabold tracking-tight sm:text-5xl">{text.pitch.title}</h1>
            <p className="text-base text-muted-foreground">{text.pitch.body}</p>
            <div className="flex items-end gap-3">
              <Volt pose="happy" className="w-20 shrink-0 sm:w-24" />
              <p className="relative mb-6 rounded-2xl rounded-bl-sm border border-border bg-muted px-4 py-3 text-sm font-semibold">{text.volt}</p>
            </div>
            <Buttons className="mt-auto" />
          </Panel>
          <Panel className="h-[22rem] overflow-hidden p-0 sm:h-[30rem] sm:p-0 lg:h-auto lg:min-h-[30rem]">
            <LandingBoard order={order} />
          </Panel>
        </section>

        <Panel>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-extrabold tracking-tight">{text.steps.title}</h2>
            {/* The intro clip shows the game loop: place a part, wire it, read the pop-up, press Check (issue #48). */}
            {intro && (
              <WatchButton clip={intro} title={watch.intro.title} label={watch.intro.title} className={cn(buttonVariants({ variant: "outline" }), "min-h-11 px-5 text-base")}>
                <PlayIcon />
                {watch.watch}
              </WatchButton>
            )}
          </div>
          <ol className="mt-4 grid gap-3 sm:grid-cols-3">
            {text.steps.items.map((item, i) => (
              <li key={item.title} className="flex gap-3 rounded-2xl bg-muted p-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full border-b-4 border-primary-deep bg-primary font-mono font-semibold text-primary-foreground">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-bold">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel>
          <h2 className="text-2xl font-extrabold tracking-tight">{text.projects.title}</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => {
              const available = project.status === "available";
              const body = (
                <>
                  <span className="text-xs font-medium text-muted-foreground">{project.board}</span>
                  <h3 className="mt-1 max-w-[12rem] text-xl leading-[1.05] font-extrabold tracking-tight">{project.title}</h3>
                  <p className="mt-2 max-w-[11rem] text-xs text-muted-foreground">{project.tagline}</p>
                  <BoardArt board={project.board} className="absolute -right-5 -bottom-3 w-32" />
                  {available ? (
                    <span className="mt-auto pt-3 text-sm font-bold text-primary">
                      {text.projects.available} · {text.projects.levels.replace("{count}", String(project.levels.length))}
                    </span>
                  ) : (
                    <Badge className="mt-auto">{text.projects.soon}</Badge>
                  )}
                </>
              );
              const card = "relative flex min-h-[11rem] flex-col overflow-hidden rounded-2xl border border-border bg-card p-4";
              return (
                <li key={project.slug} className="flex">
                  {available ? (
                    <Link href="/signup" className={cn(card, "w-full border-primary ring-2 ring-primary/30 hover:ring-primary/60")}>
                      {body}
                    </Link>
                  ) : (
                    <article className={cn(card, "w-full")}>{body}</article>
                  )}
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">{text.end.title}</h2>
            <p className="mt-1 text-muted-foreground">{text.end.body}</p>
          </div>
          <Buttons />
        </Panel>
      </main>
    </>
  );
}

// The profile page sends a learner here after "Delete my account" (issue #78).
function DeletedNotice() {
  return (
    <p role="status" className="rounded-2xl bg-card px-5 py-3 font-semibold text-foreground shadow-panel">
      {text.account_deleted}
    </p>
  );
}

function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-[28px] bg-card p-6 text-foreground shadow-panel sm:p-8", className)}>{children}</div>;
}

// Phone: full-width buttons, at least 44 px high (TRD 12.1).
function Buttons({ className }: { className?: string }) {
  return (
    <div className={cn("flex w-full flex-col gap-2 sm:w-auto sm:flex-row", className)}>
      <Button asChild className="min-h-11 px-6 text-base">
        <Link href="/signup">{text.signUp}</Link>
      </Button>
      <Button asChild variant="outline" className="min-h-11 px-6 text-base">
        <Link href="/login">{text.logIn}</Link>
      </Button>
    </div>
  );
}
