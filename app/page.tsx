import { ArrowRight, BookOpen, Cpu, Home } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { PerchFace } from "@/components/art/perch-face";
import { Backdrop } from "@/components/backdrop";
import { CourseTabs, type CourseTab } from "@/components/landing/course-tabs";
import type { CardText } from "@/components/landing/hero-cards";
import { HeroTrack } from "@/components/landing/hero-track";
import { HeroReveal, HeroRunway, type HeroLevel } from "@/components/landing/landing-board";
import { MascotBand } from "@/components/landing/mascot-band";
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
  // The hero board: all the parts of Perch, in the order that a learner puts them.
  const boards = await loadBoards(text.board.project);
  const order = wiringOrder(boards);
  // The levels of the hero board: the scroll builds them one after the other.
  const heroLevels: HeroLevel[] = (projects.find((p) => p.slug === text.board.project)?.levels ?? []).map((level, i) => ({ title: level.title, parts: boards.levels[i + 1]?.length ?? 0 }));
  // The visitor makes the first wire of the board: the first wire task of the project.
  const firstTarget = projects.find((p) => p.slug === text.board.project)?.levels[0]?.tasks.find((task) => task.kind === "wire")?.target;
  // The words of the headline come in one after the other.
  const words = (line: string, accent: boolean) => line.split(" ").map((w) => ({ text: w, accent }));
  const headline = [...words(text.pitch.title_start, false), ...words(text.pitch.title_end, true)];
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
            <>
              <Link href="/login" className="flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-white/80 hover:text-white sm:px-4">
                {text.logIn}
              </Link>
              <Link href="/start" className="hidden min-h-11 items-center rounded-full bg-sun px-5 text-sm font-semibold text-on-sun sm:flex">
                {text.getStarted}
              </Link>
            </>
          }
        />
      </header>

      <main id="top" className="flex w-full flex-1 flex-col text-white">
        <Suspense>{searchParams.then(({ deleted }) => deleted === "1" && <DeletedNotice />)}</Suspense>

        {/* The hero (issue #171), after the money.x.com hero: a short headline, one object that shows itself one time,
            then the text and the buttons (HeroReveal). The hero stays in its place while the scroll builds the board (HeroRunway, issue #173). */}
        <HeroRunway>
          <section className="mx-auto flex min-h-[calc(100svh-5rem)] w-full max-w-6xl flex-col items-center justify-center px-4 pt-8 pb-16 text-center sm:px-8">
            <h1 className="max-w-2xl text-4xl leading-[1.08] font-bold tracking-tight text-balance sm:text-5xl">
              {headline.map((word, i) => (
                <span key={i} className={cn("rise-in inline-block whitespace-pre", word.accent && "text-emerald")} style={{ animationDelay: `${i * 70}ms` }}>
                  {word.text}{" "}
                </span>
              ))}
            </h1>
            <noscript>
              <style>{".hero-after { opacity: 1 !important; }"}</style>
            </noscript>
            <HeroReveal order={order} target={firstTarget} levels={heroLevels}>
              <p className="max-w-md text-[15px] text-white/55">{text.pitch.body}</p>
              <div className="flex w-full flex-col items-center justify-center gap-2.5 sm:w-auto sm:flex-row">
                <PathButton href="/start" title={text.pitch.new.title} primary />
                <PathButton href="/start?build=perch" title={text.pitch.wired.title} />
              </div>
            </HeroReveal>
          </section>
        </HeroRunway>

        <section id="how" className="mx-auto w-full max-w-6xl scroll-mt-24 border-t border-white/10 px-4 py-20 sm:px-8 sm:py-24">
          <TutorSection />
        </section>

        <section id="projects" className="mx-auto w-full max-w-6xl scroll-mt-24 border-t border-white/10 px-4 py-20 sm:px-8 sm:py-24">
          <div className="mb-8 grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <div>
              <Eyebrow>{text.nav.projects}</Eyebrow>
              <h2 className="text-4xl leading-[1.02] font-bold tracking-tight text-balance sm:text-5xl">
                {text.courses.title_start} <span className="text-sun">{text.courses.title_end}</span>
              </h2>
              <p className="mt-3 max-w-xl text-lg text-white/65">{text.courses.body}</p>
            </div>
            {/* The four mascots: each one helps in one project. */}
            <div className={cn(GLASS, "h-56 overflow-hidden sm:h-72")}>
              <MascotBand />
            </div>
          </div>
          <CourseTabs courses={courses} />
          <div className="mt-10 grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
            <div>
              <h3 className="text-2xl font-bold tracking-tight">{text.parts.title}</h3>
              <p className="mt-2 text-white/65">{text.parts.body}</p>
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
          </div>
        </section>

        <section id="start" className="relative overflow-hidden border-t border-white/10">
          <div className="absolute -top-48 left-1/2 h-96 w-[44rem] -translate-x-1/2 rounded-full bg-emerald opacity-[0.12] blur-[100px]" aria-hidden="true" />
          <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-11 px-4 py-20 sm:px-8 sm:py-24">
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="rounded-full bg-sun px-3.5 py-1.5 text-sm font-semibold text-on-sun">{text.steps.badge}</span>
              <h2 className="text-4xl leading-none font-bold tracking-tight text-balance sm:text-6xl">{text.steps.title}</h2>
              <p className="text-lg text-white/65">{text.steps.body}</p>
            </div>
            {/* The task-card track: a learner's tasks, one after the other (after the brilliant.org hero). */}
            <div className={cn(GLASS, "overflow-hidden")}>
              <HeroTrack cards={text.hero.cards as CardText[]} check={text.hero.check} code={text.hero.code} />
            </div>
            <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {text.steps.items.map((step, i) => (
                <li key={step.title} className="flex flex-col gap-4">
                  <div
                    className={cn(
                      "relative aspect-square overflow-hidden rounded-[1.25rem] border border-white/10",
                      step.image ? "bg-[#e3e8eb]" : "flex items-center justify-center border-0 bg-sun",
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
                        step.image ? "border-white/40 bg-[#0b1210]/55 text-white" : "border-black/15 bg-black/10 text-on-sun",
                      )}
                    >
                      {i + 1}
                    </span>
                    <span
                      className={cn(
                        "absolute inset-x-[8%] bottom-[7%] flex items-center gap-2 rounded-[14px] border px-3 py-2.5 text-[13px] font-semibold shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur-lg",
                        step.image ? "border-white/15 bg-[#0e1512]/70 text-white" : "border-white/15 bg-on-sun/75 text-white",
                      )}
                      aria-hidden="true"
                    >
                      <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-[7px]", step.image ? "bg-emerald" : "bg-sun")}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-on-emerald)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
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

      <footer className="relative overflow-hidden border-t border-white/10 text-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pt-14 sm:px-8 md:flex-row md:justify-between">
          <div className="flex max-w-xs flex-col gap-3">
            <GlassLogo href="/" label="Jumper home" />
            <p className="text-sm text-white/55">{text.footer.line}</p>
          </div>
          <nav aria-label={text.footer.label} className="grid grid-cols-2 gap-x-14 gap-y-8 text-sm">
            <FooterList title={text.footer.account}>
              <FooterLink href="/login">{text.logIn}</FooterLink>
              <FooterLink href="/signup">{text.signUp}</FooterLink>
              <FooterLink href="/start">{text.getStarted}</FooterLink>
            </FooterList>
            <FooterList title={text.nav.projects}>
              {courses.map((course) => (
                <FooterLink key={course.slug} href={course.available ? `/start?build=${course.slug}` : "#projects"}>
                  {course.name}
                </FooterLink>
              ))}
            </FooterList>
          </nav>
        </div>
        {/* The name of the app, very large, as a line drawing (after the footer of money.x.com). */}
        <p
          className="mt-4 pb-6 text-center text-[clamp(5rem,24vw,20rem)] leading-[1.2] font-bold tracking-tight text-transparent select-none [-webkit-text-stroke:1px_rgba(255,255,255,0.22)]"
          aria-hidden="true"
        >
          jumper
        </p>
      </footer>
    </>
  );
}

// A hero button that tells the visitor where it goes (after the "I'm a learner" buttons of brilliant.org).
function PathButton({ href, title, primary = false }: { href: string; title: string; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-5 text-[15px] font-semibold transition-colors sm:w-auto",
        primary ? "bg-emerald text-on-emerald hover:bg-[#3be07f]" : "border border-white/15 text-white hover:bg-white/5",
      )}
    >
      {title}
      <ArrowRight size={16} strokeWidth={2.6} aria-hidden="true" />
    </Link>
  );
}

// The small name above the heading of a section.
function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-white/55">
      <span className="size-1.5 rounded-full bg-emerald" aria-hidden="true" />
      {children}
    </p>
  );
}

function FooterList({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="mb-1 font-semibold text-white/55">{title}</p>
      {children}
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="min-h-9 content-center text-white/80 underline-offset-4 hover:text-white hover:underline">
      {children}
    </Link>
  );
}

function Tick() {
  return (
    <span className="flex size-4.5 shrink-0 items-center justify-center rounded-[5px] bg-emerald" aria-hidden="true">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-on-emerald)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
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
