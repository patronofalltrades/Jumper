import Link from "next/link";
import type { ReactNode } from "react";
import { BoardArt } from "@/components/art/board-art";
import { PerchArt } from "@/components/art/perch-art";
import { Badge } from "@/components/ui/badge";
import { shortName, type Featured, type ProjectRow } from "@/lib/game/featured";
import { cn } from "@/lib/utils";

// Lobby cards. Layout and feel from the ToyCAD reference, with the Jumper colors (PRD section 10).

export type Tab = "projects" | "builds";

export function TabSwitch({ tab }: { tab: Tab }) {
  const item = (value: Tab, label: string) => (
    <Link
      href={value === "projects" ? "/lobby" : "/lobby?tab=builds"}
      aria-current={tab === value ? "page" : undefined}
      className={cn(
        "rounded-full px-5 py-2.5 text-base font-bold transition-colors sm:px-7",
        tab === value ? "bg-white text-[#13202a] shadow" : "text-white hover:bg-white/10",
      )}
    >
      {label}
    </Link>
  );
  return (
    <nav aria-label="Lobby" className="col-span-2 flex justify-self-center rounded-full bg-[#13202a] p-1.5 ring-4 ring-white/10 sm:col-span-1">
      {item("projects", "Projects")}
      {item("builds", "My builds")}
    </nav>
  );
}

// Phone: full width, as tall as the content. Laptop: a fixed height, so the row lines up.
export const CARD = "relative flex min-h-[15rem] flex-col overflow-hidden rounded-[28px] p-6 sm:h-[29rem] sm:p-8";

export function ContinueCard({ featured, name }: { featured: Featured; name: string }) {
  const { project, level, levelTitle, started, href } = featured;
  return (
    <Link href={href} className={cn(CARD, "group min-h-[24rem] w-full bg-card sm:w-[84vw] sm:max-w-[32rem] text-foreground shadow-panel")}>
      <span className="text-sm font-medium text-muted-foreground">Hi, {name}</span>
      <h2 className="mt-3 text-5xl leading-[0.95] font-extrabold tracking-tight sm:text-6xl">
        {started ? "Continue" : "Start"}
        <br />
        {shortName(project.title)}
      </h2>
      {/* The text stays in front of the picture, and a long level name wraps before it gets to the picture. */}
      <p className="relative z-10 mt-4 text-base text-balance sm:max-w-[15rem] text-muted-foreground">
        Level {level}
        {levelTitle && ` · ${levelTitle}`}
      </p>
      <p className="relative z-10 mt-1 font-mono text-xs font-medium tracking-wide text-muted-foreground uppercase">{project.board}</p>
      <PerchArt className="absolute -right-8 -bottom-6 w-56 transition-transform group-hover:-rotate-3 sm:w-64" />
      <span className="mt-auto flex size-16 items-center justify-center rounded-full border-b-4 border-primary-deep bg-primary text-primary-foreground transition-[transform,border] group-active:translate-y-0.5 group-active:border-b-2">
        <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
        </svg>
        <span className="sr-only">{started ? `Continue ${shortName(project.title)}, level ${level}` : `Start ${shortName(project.title)}`}</span>
      </span>
    </Link>
  );
}

export function ProjectCard({ project }: { project: ProjectRow }) {
  const available = project.status === "available";
  const body = (
    <>
      <span className="text-xs font-medium text-muted-foreground">{project.board}</span>
      <h3 className="mt-1.5 max-w-[11rem] text-2xl leading-[1.05] font-extrabold tracking-tight">{project.title}</h3>
      <p className="mt-2 max-w-[10rem] text-xs text-muted-foreground">{project.tagline}</p>
      <BoardArt board={project.board} className="absolute -right-6 -bottom-3 w-40" />
      <span className="absolute top-4 right-4 flex size-10 items-center justify-center rounded-full bg-[#13202a] text-white">
        {available ? (
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
        )}
      </span>
      {!available && <Badge className="mt-auto">Coming soon</Badge>}
    </>
  );
  const className = "relative flex min-h-[12rem] flex-1 flex-col overflow-hidden rounded-[28px] bg-card p-5 text-foreground shadow-panel";
  return available ? (
    <Link href={`/p/${project.slug}`} className={cn(className, "w-full sm:w-[72vw] sm:max-w-[20rem]")}>
      {body}
    </Link>
  ) : (
    <article className={cn(className, "w-full sm:w-[72vw] sm:max-w-[20rem]")}>
      {body}
    </article>
  );
}

export function DarkCard({ label, title, children }: { label: string; title: string; children: ReactNode }) {
  return (
    <article className={cn(CARD, "w-full bg-[#13202a] sm:w-[72vw] sm:max-w-[21rem] text-white shadow-panel")}>
      <span className="text-xs font-medium text-white/60">{label}</span>
      <h3 className="mt-2 text-3xl leading-[1.05] font-extrabold tracking-tight">{title}</h3>
      <div className="mt-3 flex flex-1 flex-col">{children}</div>
    </article>
  );
}

// [a, b, c, d, e] → [[a, b], [c, d], [e]]: the small cards stand two to a column.
export function pairs<T>(items: T[]): T[][] {
  return Array.from({ length: Math.ceil(items.length / 2) }, (_, i) => items.slice(i * 2, i * 2 + 2));
}
