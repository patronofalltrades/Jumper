import { ArrowRight, BookOpen, Cpu, Home, Zap } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { PerchFace } from "@/components/art/perch-face";
import { Backdrop } from "@/components/backdrop";
import { CourseTabs, type CourseTab } from "@/components/landing/course-tabs";
import type { CardText } from "@/components/landing/hero-cards";
import { HeroTrack } from "@/components/landing/hero-track";
import { LandingBoard } from "@/components/landing/landing-board";
import { GlassLogo } from "@/components/logo";
import { TutorSection } from "@/components/landing/tutor-section";
import { GlassmorphismNavBar } from "@/components/ui/glassmorphism-navigation";
import { GLASS, PRIMARY } from "@/components/ui/surfaces";
import text from "@/content/ui/landing.json";
import { loadBoards } from "@/lib/content/boards";
import { loadProjects } from "@/lib/content/load";
import { wiringOrder } from "@/lib/game/landing";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: text.meta.title, description: text.meta.description };

// The landing page for visitors who are not logged in (issue #46). The proxy sends a logged-in user to the lobby.
// Layout from the duolingo.com home page (issue #152), with the 3D breadboard as the hero (issue #171).
// The catalog comes from content/projects/, not the database.
export default async function LandingPage({ searchParams }: PageProps<"/">) {
  const projects = loadProjects();
  const available = projects.filter((p) => p.status === "available");
  // The hero board: all the parts of Perch, in the order that a learner puts them.
  const order = wiringOrder(await loadBoards(text.board.project));
  const courses: CourseTab[] = text.courses.show.flatMap((slug) => {
    const p = projects.find((project) => project.slug === slug);
    if (!p) return [];
    const open = p.status === "available";
    return [{ slug, name: p.title.split(":")[0], title: p.title, board: p.board, tagline: p.tagline, available: open, items: open ? p.levels.map((l) => l.title) : p.tagline.split(", ") }];
  });

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
          start={<GlassLogo href="/" label="Jumper home" />}
          end={
            <Link href="/login" className="flex min-h-11 items-center rounded-full bg-[#f5c518] px-4 text-sm font-semibold text-[#1a1400] sm:px-5">
              {text.logIn}
            </Link>
          }
        />
      </header>

      <main id="top" className="flex w-full flex-1 flex-col text-white">
        <Suspense>{searchParams.then(({ deleted }) => deleted === "1" && <DeletedNotice />)}</Suspense>

        <section className="mx-auto grid w-full max-w-7xl items-center gap-6 px-4 pt-6 pb-16 sm:px-8 sm:pt-10 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:gap-8">
          <div className={cn(GLASS, "relative h-[24rem] overflow-hidden sm:h-[30rem] lg:h-[38rem]")}>
            <LandingBoard order={order} />
          </div>
          <div className={cn(GLASS, "flex flex-col items-center gap-6 px-6 py-8 text-center sm:px-10 sm:py-10")}>
            <span className="rounded-full bg-[#22d66b] px-3.5 py-1.5 text-sm font-semibold text-[#04140a]">{text.pitch.badge}</span>
            <h1 className="text-4xl leading-[1.05] font-bold tracking-tight text-balance sm:text-5xl">
              {text.pitch.title_start} <span className="text-[#22d66b]">{text.pitch.title_end}</span>
            </h1>
            <p className="text-lg text-white/65">{text.pitch.body}</p>
            <div className="flex w-full max-w-sm flex-col gap-3">
              <PathButton href="/start" title={text.pitch.new.title} body={text.pitch.new.body} primary />
              <PathButton href="/start?build=perch" title={text.pitch.wired.title} body={text.pitch.wired.body} />
              <Link href="/login" className="min-h-11 content-center font-medium text-white/80 underline-offset-4 hover:underline">
                {text.haveAccount}
              </Link>
            </div>
            <p className="text-[13px] text-white/55">
              {text.pitch.facts.replace("{available}", String(available.length)).replace("{soon}", String(projects.length - available.length))}
            </p>
          </div>
        </section>

        {/* The task-card track: a learner's tasks, one after the other (after the brilliant.org hero). */}
        <div className="mx-auto -mt-6 w-full max-w-6xl px-4 pb-12 sm:px-8 sm:pb-16">
          <div className={cn(GLASS, "overflow-hidden")}>
            <HeroTrack cards={text.hero.cards as CardText[]} check={text.hero.check} code={text.hero.code} />
          </div>
        </div>

        <section id="how" className="mx-auto w-full max-w-6xl scroll-mt-24 border-t border-white/10 px-4 py-20 sm:px-8 sm:py-24">
          <TutorSection />
        </section>

        <section id="projects" className="mx-auto w-full max-w-6xl scroll-mt-24 border-t border-white/10 px-4 py-20 sm:px-8 sm:py-24">
          <h2 className="text-4xl leading-[1.02] font-bold tracking-tight text-balance sm:text-5xl">
            {text.courses.title_start} <span className="text-[#f5c518]">{text.courses.title_end}</span>
          </h2>
          <p className="mt-3 mb-8 max-w-xl text-lg text-white/65">{text.courses.body}</p>
          <CourseTabs courses={courses} />
        </section>

        <section aria-labelledby="parts-title" className="mx-auto grid w-full max-w-6xl items-center gap-8 border-t border-white/10 px-4 py-16 sm:px-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <div>
            <h2 id="parts-title" className="text-3xl font-bold tracking-tight">
              {text.parts.title}
            </h2>
            <p className="mt-3 text-lg text-white/65">{text.parts.body}</p>
          </div>
          <ul className="flex flex-wrap gap-2.5">
            {text.parts.items.map((part) => (
              <li key={part.name} className="flex min-h-11 items-center gap-2.5 rounded-full border border-white/10 bg-night-2 px-4">
                <Tick />
                <span className="font-mono text-sm font-medium">{part.name}</span>
                <span className="text-[13px] text-white/55">{part.job}</span>
              </li>
            ))}
          </ul>
        </section>

        <section id="start" className="relative overflow-hidden border-t border-white/10">
          <div className="absolute -top-48 left-1/2 h-96 w-[44rem] -translate-x-1/2 rounded-full bg-[#22d66b] opacity-[0.12] blur-[100px]" aria-hidden="true" />
          <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-11 px-4 py-20 sm:px-8 sm:py-24">
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="rounded-full bg-[#f5c518] px-3.5 py-1.5 text-sm font-semibold text-[#1a1400]">{text.steps.badge}</span>
              <h2 className="text-4xl leading-none font-bold tracking-tight text-balance sm:text-6xl">{text.steps.title}</h2>
              <p className="text-lg text-white/65">{text.steps.body}</p>
            </div>
            <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {text.steps.items.map((step, i) => (
                <li key={step.title} className="flex flex-col gap-4">
                  <div
                    className={cn(
                      "relative aspect-square overflow-hidden rounded-[1.25rem] border border-white/10",
                      step.image ? "bg-[#e3e8eb]" : "flex items-center justify-center border-0 bg-[#f5c518]",
                    )}
                  >
                    {step.image ? (
                      <Image src={step.image} alt={step.alt} fill sizes="(min-width: 1024px) 270px, (min-width: 640px) 45vw, 90vw" className="object-cover" />
                    ) : (
                      <>
                        <div className="absolute inset-[15%] rounded-full bg-[#fff3b0] opacity-80 blur-2xl" aria-hidden="true" />
                        <PerchFace className="relative w-[62%] -translate-y-[8%]" />
                        <span className="sr-only">{step.alt}</span>
                      </>
                    )}
                    <span
                      className={cn(
                        "absolute top-3.5 left-3.5 flex size-8 items-center justify-center rounded-[10px] border text-sm font-semibold backdrop-blur-md",
                        step.image ? "border-white/40 bg-[#0b1210]/55 text-white" : "border-black/15 bg-black/10 text-[#1a1400]",
                      )}
                    >
                      {i + 1}
                    </span>
                    <span
                      className={cn(
                        "absolute inset-x-[8%] bottom-[7%] flex items-center gap-2 rounded-[14px] border px-3 py-2.5 text-[13px] font-semibold shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur-lg",
                        step.image ? "border-white/15 bg-[#0e1512]/70 text-white" : "border-white/15 bg-[#1a1400]/75 text-white",
                      )}
                      aria-hidden="true"
                    >
                      <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-[7px]", step.image ? "bg-[#22d66b]" : "bg-[#f5c518]")}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#04140a" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12.5l4.5 4.5L19 7.5" />
                        </svg>
                      </span>
                      {step.tag}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold tracking-tight">{step.title}</h3>
                    <p className="mt-1.5 text-white/65">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="flex flex-col items-center gap-4">
              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
                <Link href="/start" className={PRIMARY}>
                  {text.end.button}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
                <Link href="/login" className="min-h-11 content-center font-medium text-white/80 underline-offset-4 hover:underline">
                  {text.haveAccount}
                </Link>
              </div>
              <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-white/65">
                {text.end.points.map((point) => (
                  <li key={point} className="flex items-center gap-2">
                    <Tick />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

// A big hero button that tells the visitor where it goes (after the "I'm a learner" buttons of brilliant.org).
function PathButton({ href, title, body, primary = false }: { href: string; title: string; body: string; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex min-h-16 items-center gap-3.5 rounded-full py-2 pr-5 pl-2.5 text-left transition-[transform,border]",
        primary
          ? "border-b-4 border-[#15a352] bg-[#22d66b] text-[#04140a] shadow-[0_0_40px_rgba(34,214,107,0.35)] active:translate-y-0.5 active:border-b-2"
          : "border border-white/15 bg-night text-white hover:bg-white/5",
      )}
    >
      <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-full", primary ? "bg-[#04140a] text-[#22d66b]" : "bg-[#f5c518] text-[#1a1400]")} aria-hidden="true">
        {primary ? <Zap size={20} fill="currentColor" strokeWidth={0} /> : <Cpu size={20} strokeWidth={2.4} />}
      </span>
      <span className="flex flex-1 flex-col">
        <strong className="text-[17px] font-bold">{title}</strong>
        <span className={cn("text-[13px]", primary ? "opacity-75" : "text-white/60")}>{body}</span>
      </span>
      <ArrowRight size={20} strokeWidth={2.6} aria-hidden="true" />
    </Link>
  );
}

function Tick() {
  return (
    <span className="flex size-4.5 shrink-0 items-center justify-center rounded-[5px] bg-[#22d66b]" aria-hidden="true">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#04140a" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    </span>
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
