import { BookOpen, Cpu, Home } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { BoardArt } from "@/components/art/board-art";
import { Volt } from "@/components/art/volt";
import { Backdrop } from "@/components/backdrop";
import { LandingBoard } from "@/components/landing/landing-board";
import { GlassmorphismNavBar } from "@/components/ui/glassmorphism-navigation";
import { PlayIcon, WatchButton } from "@/components/walkthrough/watch-button";
import text from "@/content/ui/landing.json";
import watch from "@/content/ui/walkthrough.json";
import { loadBoards } from "@/lib/content/boards";
import { loadIntroClip } from "@/lib/content/clips";
import { loadProjects } from "@/lib/content/load";
import { wiringOrder } from "@/lib/game/landing";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: text.meta.title, description: text.meta.description };

// The landing page sits on the night backdrop in both themes (Emerald Sun, issue #152), so its colors are fixed:
// emerald and sun on near-black, with frosted-glass panels.
const GLASS =
  "rounded-[1.25rem] border border-white/10 bg-night-2/55 shadow-[0_24px_70px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl backdrop-saturate-[1.8]";
const SOLID = "rounded-[1.25rem] border border-white/10 bg-night-2";
const PRIMARY =
  "inline-flex min-h-13 items-center justify-center gap-3 rounded-full border-b-4 border-[#15a352] bg-[#22d66b] px-7 text-base font-semibold text-[#04140a] shadow-[0_0_40px_rgba(34,214,107,0.35)] transition-[transform,border] active:translate-y-0.5 active:border-b-2";
const OUTLINE =
  "inline-flex min-h-13 items-center justify-center rounded-full border border-white/15 bg-night px-7 text-base font-medium text-white hover:bg-white/5";

// The landing page for visitors who are not logged in (issue #46). The proxy sends a logged-in user to the lobby.
// Layout from the duolingo.com home page (issue #152). The catalog comes from content/projects/, not the database.
export default async function LandingPage({ searchParams }: PageProps<"/">) {
  const projects = loadProjects();
  const featured = projects.find((p) => p.status === "available");
  const order = featured ? wiringOrder(await loadBoards(featured.slug)) : [];
  const intro = await loadIntroClip();
  const boards = [...new Map(projects.map((p) => [p.board, p.status === "available"])).entries()];

  return (
    <>
      <Backdrop />
      <header className="sticky top-0 z-30 flex justify-center px-3 pt-3 sm:pt-4">
        <GlassmorphismNavBar
          active={text.nav.home}
          items={[
            { name: text.nav.home, href: "#top", icon: <Home size={18} strokeWidth={2.5} /> },
            { name: text.nav.how, href: "#how", icon: <BookOpen size={18} strokeWidth={2.5} /> },
            { name: text.nav.projects, href: "#projects", icon: <Cpu size={18} strokeWidth={2.5} /> },
          ]}
          start={
            <Link href="/" className="flex min-h-11 items-center gap-2 pr-2 pl-1 sm:pr-3" aria-label="Jumper home">
              <span className="flex size-8 items-center justify-center rounded-full bg-[#22d66b]">
                <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" fill="#04140a" />
                </svg>
              </span>
              <span className="hidden text-xl font-bold tracking-tight min-[400px]:inline">jumper</span>
            </Link>
          }
          end={
            <Link href="/login" className="flex min-h-11 items-center rounded-full bg-[#f5c518] px-4 text-sm font-semibold text-[#1a1400] sm:px-5">
              {text.logIn}
            </Link>
          }
        />
      </header>

      <main id="top" className="flex w-full flex-1 flex-col text-white">
        <Suspense>{searchParams.then(({ deleted }) => deleted === "1" && <DeletedNotice />)}</Suspense>

        <section className="mx-auto grid w-full max-w-6xl items-center gap-6 px-4 pt-8 pb-16 sm:px-8 sm:pt-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-10">
          <div className={cn(GLASS, "h-[22rem] overflow-hidden sm:h-[30rem]")}>
            <LandingBoard order={order} />
          </div>
          <div className={cn(GLASS, "flex flex-col items-center gap-6 px-6 py-8 text-center sm:px-10 sm:py-10")}>
            <span className="rounded-full bg-[#22d66b] px-3.5 py-1.5 text-sm font-semibold text-[#04140a]">{text.pitch.badge}</span>
            <h1 className="text-4xl leading-[1.05] font-bold tracking-tight text-balance sm:text-5xl">{text.pitch.title}</h1>
            <p className="text-lg text-white/65">{text.pitch.body}</p>
            <div className="flex w-full max-w-sm flex-col gap-3">
              <Link href="/signup" className={PRIMARY}>
                {text.getStarted}
              </Link>
              <Link href="/login" className={OUTLINE}>
                {text.haveAccount}
              </Link>
            </div>
            <div className="flex items-end gap-3 text-left">
              <Volt pose="happy" className="w-14 shrink-0" />
              <p className="mb-4 rounded-2xl rounded-bl-sm border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm font-medium">{text.volt}</p>
            </div>
          </div>
        </section>

        <section aria-label={text.boards.label} className="border-y border-white/10 bg-night/60">
          <ul className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-3 px-4 py-4 sm:px-8">
            {boards.map(([board, available]) => (
              <li
                key={board}
                className={cn(
                  "flex min-h-11 items-center gap-2.5 rounded-full border border-white/10 px-4 text-sm font-medium",
                  available ? "text-white" : "text-white/50",
                )}
              >
                <span className={cn("size-2.5 rounded-full", available ? "bg-[#22d66b]" : "bg-white/25")} aria-hidden="true" />
                {board}
                {!available && <span className="sr-only">({text.boards.soon})</span>}
              </li>
            ))}
          </ul>
        </section>

        <section id="how" className="mx-auto flex w-full max-w-6xl scroll-mt-24 flex-col gap-20 px-4 py-20 sm:gap-28 sm:px-8 sm:py-24">
          <Feature index={0} flip={false}>
            <div className={cn(SOLID, "flex flex-col gap-3 p-6")}>
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-lg font-semibold">{featured?.title}</h3>
                {intro && (
                  <WatchButton clip={intro} title={watch.intro.title} label={watch.intro.title} className={cn(OUTLINE, "min-h-11 shrink-0 gap-2 px-4 text-sm whitespace-nowrap")}>
                    <PlayIcon />
                    {watch.watch}
                  </WatchButton>
                )}
              </div>
              <ol className="flex flex-col gap-2">
                {featured?.levels.map((level, i) => (
                  <li key={level.title} className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] py-1.5 pr-4 pl-1.5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#22d66b] font-semibold text-[#04140a]">{i + 1}</span>
                    <span className="text-sm font-medium">{level.title}</span>
                  </li>
                ))}
              </ol>
            </div>
          </Feature>
          <Feature index={1} flip>
            <div className={cn(SOLID, "flex flex-col gap-2.5 p-6")}>
              <p className="text-xs font-semibold tracking-widest text-white/55 uppercase">{text.examples.parts_label}</p>
              {text.examples.parts.map((part, i) => (
                <div key={part.name} className="flex items-center justify-between gap-3 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2.5">
                  <span className="font-mono text-sm font-medium">{part.name}</span>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", i % 2 ? "bg-[#f5c518] text-[#1a1400]" : "bg-[#22d66b] text-[#04140a]")}>
                    {part.job}
                  </span>
                </div>
              ))}
            </div>
          </Feature>
          <Feature index={2} flip={false}>
            <div className="relative overflow-hidden rounded-[1.25rem] border border-white/10 bg-night-2 p-6">
              <div className="absolute -top-10 -left-10 size-40 rounded-full bg-[#22d66b] opacity-40 blur-3xl" aria-hidden="true" />
              <div className="absolute -right-10 -bottom-12 size-40 rounded-full bg-[#f5c518] opacity-35 blur-3xl" aria-hidden="true" />
              <ul className="relative grid grid-cols-3 gap-3">
                {text.examples.rewards.map((reward) => (
                  <li key={reward.label} className={cn(GLASS, "bg-white/10 px-2 py-5 text-center")}>
                    <span className="block text-3xl font-bold tracking-tight">{reward.value}</span>
                    <span className="text-xs font-medium text-white/70">{reward.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Feature>
          <Feature index={3} flip>
            <div className="flex flex-col gap-3">
              <div className={cn(SOLID, "flex flex-col gap-2 border-[#22d66b] p-5")}>
                <span className="w-fit rounded-full bg-[#22d66b] px-2.5 py-0.5 text-xs font-semibold text-[#04140a]">{text.examples.why_label}</span>
                <p className="font-medium">{text.examples.why}</p>
              </div>
              <div className={cn(SOLID, "flex flex-col gap-2 border-[#e5221f] p-5")}>
                <span className="w-fit rounded-full bg-[#e5221f] px-2.5 py-0.5 text-xs font-semibold text-white">{text.examples.mistake_label}</span>
                <p className="font-medium">{text.examples.mistake}</p>
              </div>
            </div>
          </Feature>
        </section>

        <section id="projects" className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 pb-20 sm:px-8">
          <h2 className="text-3xl font-bold tracking-tight">{text.projects.title}</h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => {
              const available = project.status === "available";
              const card = cn(SOLID, "relative flex min-h-44 w-full flex-col overflow-hidden p-5", available ? "border-[#22d66b]/60 hover:border-[#22d66b]" : "border-dashed");
              const body = (
                <>
                  <span className="text-xs font-medium text-white/55">{project.board}</span>
                  <h3 className="mt-1 max-w-48 text-xl leading-[1.1] font-bold tracking-tight">{project.title}</h3>
                  <p className="mt-2 max-w-44 text-xs text-white/60">{project.tagline}</p>
                  <BoardArt board={project.board} className="absolute -right-5 -bottom-3 w-32" />
                  {available ? (
                    <span className="mt-auto pt-3 text-sm font-semibold text-[#22d66b]">
                      {text.projects.available} · {text.projects.levels.replace("{count}", String(project.levels.length))}
                    </span>
                  ) : (
                    <span className="mt-auto w-fit rounded-full border border-white/15 px-2.5 py-0.5 text-xs font-semibold text-white/75">{text.projects.soon}</span>
                  )}
                </>
              );
              return (
                <li key={project.slug} className="flex">
                  {available ? (
                    <Link href="/signup" className={card}>
                      {body}
                    </Link>
                  ) : (
                    <article className={card}>{body}</article>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="relative overflow-hidden px-4 pb-24 sm:px-8">
          <div className={cn(GLASS, "relative mx-auto flex max-w-6xl flex-wrap items-center gap-10 rounded-[2rem] p-8 sm:p-12")}>
            <div className="flex min-w-0 flex-[999_1_22rem] flex-col gap-5">
              <span className="w-fit rounded-full bg-[#f5c518] px-3.5 py-1.5 text-sm font-semibold text-[#1a1400]">{text.end.badge}</span>
              <h2 className="text-4xl leading-none font-bold tracking-tight text-balance sm:text-6xl">{text.end.title}</h2>
              <p className="max-w-lg text-lg text-white/65">{text.end.body}</p>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                <Link href="/signup" className={PRIMARY}>
                  {text.end.button}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
                <Link href="/login" className="min-h-11 content-center font-medium text-white/80 underline-offset-4 hover:underline">
                  {text.haveAccount}
                </Link>
              </div>
              <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/65">
                {text.end.points.map((point) => (
                  <li key={point} className="flex items-center gap-2">
                    <span className="flex size-4.5 items-center justify-center rounded-[5px] bg-[#22d66b]" aria-hidden="true">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#04140a" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12.5l4.5 4.5L19 7.5" />
                      </svg>
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
            <Volt pose="cheer" className="mx-auto w-28 sm:w-48" />
          </div>
        </section>
      </main>
    </>
  );
}

// A feature row: big green heading and text on one side, an example on the other. `flip` puts the example first.
function Feature({ index, flip, children }: { index: number; flip: boolean; children: ReactNode }) {
  const feature = text.features[index];
  return (
    <div className="grid items-center gap-8 md:grid-cols-2 md:gap-14">
      <div className={cn(flip && "md:order-2")}>
        <h2 className="text-4xl leading-[1.02] font-bold tracking-tight text-[#22d66b] sm:text-5xl">{feature.title}</h2>
        <p className="mt-4 text-lg text-white/65">{feature.body}</p>
      </div>
      <div className={cn("w-full max-w-md justify-self-center", flip && "md:order-1")}>{children}</div>
    </div>
  );
}

// The profile page sends a learner here after "Delete my account" (issue #78).
function DeletedNotice() {
  return (
    <p role="status" className="mx-auto mt-6 w-fit rounded-full border border-white/10 bg-night-2 px-5 py-3 font-semibold">
      {text.account_deleted}
    </p>
  );
}
