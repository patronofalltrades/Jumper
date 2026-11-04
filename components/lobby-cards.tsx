import Link from "next/link";
import type { ReactNode } from "react";
import { BoardArt } from "@/components/art/board-art";
import { PerchArt } from "@/components/art/perch-art";
import { TourStep } from "@/components/tour";
import { GLASS, PRIMARY, SOLID } from "@/components/ui/surfaces";
import text from "@/content/ui/lobby.json";
import { shortName, type Featured, type ProjectRow } from "@/lib/game/featured";
import { cn } from "@/lib/utils";

// Lobby cards. Layout from the ToyCAD reference; surfaces and colors from the Emerald Sun landing page (issue #152).

export type Tab = "projects" | "builds";

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k]));

// Phone: full width, as tall as the content. Laptop: a fixed height, so the row lines up.
export const CARD = "relative flex min-h-[15rem] flex-col overflow-hidden p-6 text-white sm:h-[29rem] sm:p-8";

function PlayIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
    </svg>
  );
}

// The hero of the lobby, in the look of the landing hero (issue #152): a glass panel with soft glows, an emerald level
// badge, a big title and the emerald pill button.
export function ContinueCard({ featured, name }: { featured: Featured; name: string }) {
  const { project, level, levelTitle, started, mapHref, href } = featured;
  const short = shortName(project.title);
  return (
    <TourStep id="start" wideSide="right">
  <article className={cn(CARD, GLASS, "group isolate min-h-[26rem] w-full sm:w-[84vw] sm:max-w-[32rem]")}>
        <div className="absolute -top-16 -left-16 -z-10 size-56 rounded-full bg-[#22d66b] opacity-25 blur-3xl" aria-hidden="true" />
        <div className="absolute -right-12 -bottom-16 -z-10 size-56 rounded-full bg-[#f5c518] opacity-20 blur-3xl" aria-hidden="true" />
        {/* The body opens the level map. The link covers the whole card, and the play button sits above it, so no link is inside a link. */}
        <Link
          href={mapHref}
          className="flex flex-col items-start outline-none after:absolute after:inset-0 after:rounded-[1.25rem] focus-visible:after:ring-2 focus-visible:after:ring-[#22d66b]"
        >
          <span className="text-sm font-medium text-white/65">{fill(text.hi, { name })}</span>
          <h2 className="mt-3 text-5xl leading-[0.95] font-bold tracking-tight sm:text-6xl">
            {started ? text.continue : text.start}
            <br />
            <span className="text-[#22d66b]">{short}</span>
          </h2>
          {/* The text stays in front of the picture, and a long level name wraps before it gets to the picture. */}
          <span className="relative z-10 mt-5 rounded-full bg-[#22d66b] px-3 py-1 text-sm font-semibold text-[#04140a]">{fill(text.level, { level })}</span>
          {levelTitle && <p className="relative z-10 mt-2 text-base text-balance text-white/70 sm:max-w-[15rem]">{levelTitle}</p>}
          <p className="relative z-10 mt-2 font-mono text-xs font-medium tracking-wide text-white/45 uppercase">{project.board}</p>
        </Link>
        <PerchArt className="pointer-events-none absolute -right-8 -bottom-6 w-56 transition-transform group-hover:-rotate-3 sm:w-64" />
        <Link href={href} className={cn(PRIMARY, "relative z-10 mt-auto w-fit pr-8 pl-6 outline-none focus-visible:ring-2 focus-visible:ring-white")}>
          <PlayIcon size={20} />
          <span aria-hidden="true">{started ? text.continue : text.start}</span>
          <span className="sr-only">{started ? `${text.continue} ${short}, level ${level}` : `${text.start} ${short}`}</span>
        </Link>
      </article>
    </TourStep>
  );
}

// A project card, in the look of the project cards of the landing page: emerald edge when it can be played, a dashed
// edge when it is coming soon.
export function ProjectCard({ project }: { project: ProjectRow }) {
  const available = project.status === "available";
  const count = project.levels[0]?.count ?? 0;
  const body = (
    <>
      <span className="text-xs font-medium text-white/55">{project.board}</span>
      <h3 className="mt-1.5 max-w-[11rem] text-2xl leading-[1.05] font-bold tracking-tight">{project.title}</h3>
      <p className="mt-2 max-w-[10rem] text-xs text-white/60">{project.tagline}</p>
      <BoardArt board={project.board} className={cn("absolute -right-6 -bottom-3 w-40", !available && "opacity-60")} />
      {available ? (
        <span className="relative mt-auto flex items-center gap-2 pt-3 text-sm font-semibold text-[#22d66b]">
          <PlayIcon />
          {text.play}
          {count > 0 && ` · ${fill(text.levels, { count })}`}
        </span>
      ) : (
        <span className="relative mt-auto w-fit rounded-full border border-white/15 bg-night-2 px-2.5 py-0.5 text-xs font-semibold text-white/75">{text.soon}</span>
      )}
    </>
  );
  const className = cn(
    SOLID,
    "relative flex min-h-[12rem] w-full flex-1 flex-col overflow-hidden p-5 text-white transition-colors sm:w-[72vw] sm:max-w-[20rem]",
    available ? "border-[#22d66b]/60 hover:border-[#22d66b]" : "border-dashed",
  );
  return available ? (
    <Link href={`/p/${project.slug}`} className={className}>
      {body}
    </Link>
  ) : (
    <article className={className}>{body}</article>
  );
}

export function DarkCard({ label, title, children }: { label: string; title: string; children: ReactNode }) {
  return (
    <article className={cn(CARD, SOLID, "w-full sm:w-[72vw] sm:max-w-[21rem]")}>
      <span className="text-xs font-medium text-white/60">{label}</span>
      <h3 className="mt-2 text-3xl leading-[1.05] font-bold tracking-tight">{title}</h3>
      <div className="mt-3 flex flex-1 flex-col">{children}</div>
    </article>
  );
}

// [a, b, c, d, e] → [[a, b], [c, d], [e]]: the small cards stand two to a column.
export function pairs<T>(items: T[]): T[][] {
  return Array.from({ length: Math.ceil(items.length / 2) }, (_, i) => items.slice(i * 2, i * 2 + 2));
}
