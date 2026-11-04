import { Check, Lock, Trophy, Zap } from "lucide-react";
import Link from "next/link";
import { GLASS } from "@/components/ui/surfaces";
import text from "@/content/ui/lobby.json";
import { levelStatuses } from "@/lib/game/map";
import { PATH_WIDTH, progressPercent, tilePath } from "@/lib/game/tile-path";
import { cn } from "@/lib/utils";

// The level path of the featured project in the lobby (issue #152, after the Mimo level list): square tiles on a dot
// grid that looks like breadboard holes, joined by wires. Done levels are emerald, the level to play is sun yellow,
// locked levels are dark. The last tile is the end of the project. The unlock rule is the one of the level map.

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k]));

type Level = { position: number; title: string };

export function TilePath({ slug, project, levels, passed }: { slug: string; project: string; levels: Level[]; passed: number[] }) {
  const statuses = levelStatuses(levels.length, passed);
  const doneCount = statuses.filter((s) => s === "done").length;
  const current = levels[statuses.indexOf("open")];
  const allDone = doneCount === levels.length;
  // The end tile counts as one more tile; its wire is done when every level passed.
  const { points, done, todo, height } = tilePath(levels.length + 1, doneCount);
  const percent = progressPercent(levels.length, doneCount);
  const at = (i: number) => ({ left: `${(points[i][0] / PATH_WIDTH) * 100}%`, top: `${(points[i][1] / height) * 100}%` });

  return (
    <section aria-labelledby="path-title" className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 text-white">
      <h2 id="path-title" className="sr-only">
        {text.path.title}
      </h2>
      <div className={cn(GLASS, "flex items-center justify-between gap-3 rounded-full py-2.5 pr-2.5 pl-6")}>
        <div className="min-w-0">
          <p className="font-mono text-[11px] font-semibold tracking-wider text-white/55 uppercase">{project}</p>
          <p className="truncate text-xl leading-tight font-bold">
            {current ? fill(text.path.level, { level: current.position, title: current.title }) : text.path.end}
          </p>
        </div>
        <Link
          href={`/p/${slug}`}
          aria-label={`${text.path.map}. ${fill(text.path.progress, { project, percent })}`}
          className="relative flex size-14 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#22d66b]"
        >
          <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90" aria-hidden="true">
            <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
            {percent > 0 && (
              <circle cx="18" cy="18" r="15" fill="none" stroke="#f5c518" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(percent / 100) * 94.2} 94.2`} />
            )}
          </svg>
          <span className="relative text-sm font-bold" aria-hidden="true">
            {percent}%
          </span>
        </Link>
      </div>

      <ol
        className="relative mx-auto w-full max-w-[340px] bg-[radial-gradient(circle,rgba(255,255,255,0.07)_3px,transparent_3.6px)] bg-[length:28px_28px] bg-[position:14px_14px]"
        style={{ aspectRatio: `${PATH_WIDTH} / ${height}` }}
      >
        <svg viewBox={`0 0 ${PATH_WIDTH} ${height}`} className="absolute inset-0 size-full" aria-hidden="true">
          <path d={todo} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="8" strokeLinecap="round" />
          <path d={done} fill="none" stroke="#22d66b" strokeWidth="8" strokeLinecap="round" />
        </svg>
        {levels.map((level, i) => {
          const status = statuses[i];
          const values = { level: level.position, title: level.title };
          const tile = "absolute flex aspect-square w-[24%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[22px] border-b-[7px]";
          return (
            <li key={level.position} style={at(i)} className="contents">
              {status === "locked" ? (
                <span role="img" aria-label={fill(text.path.locked, values)} style={at(i)} className={cn(tile, "border border-b-[7px] border-white/10 bg-night-2 text-white/35")}>
                  <Lock size={24} strokeWidth={2.4} aria-hidden="true" />
                </span>
              ) : (
                <Link
                  href={`/p/${slug}/${level.position}`}
                  aria-label={fill(status === "done" ? text.path.done : text.path.open, values)}
                  style={at(i)}
                  className={cn(
                    tile,
                    "outline-none transition-[transform,border] focus-visible:ring-2 focus-visible:ring-white active:border-b-[3px]",
                    status === "done" && "border-[#15a352] bg-[#22d66b] text-[#04140a]",
                    status === "open" && "border-[#b8920c] bg-[#f5c518] text-[#1a1400] shadow-[0_0_0_6px_rgba(245,197,24,0.18),0_0_44px_rgba(245,197,24,0.45)]",
                  )}
                >
                  {status === "done" ? <Check size={32} strokeWidth={3} aria-hidden="true" /> : <Zap size={30} fill="currentColor" strokeWidth={0} aria-hidden="true" />}
                  {status === "open" && (
                    <span className="absolute bottom-[calc(100%+12px)] left-1/2 -translate-x-1/2 rounded-full bg-white px-3.5 py-1.5 text-sm font-bold whitespace-nowrap text-[#04140a]" aria-hidden="true">
                      {text.path.start}
                    </span>
                  )}
                </Link>
              )}
            </li>
          );
        })}
        <li style={at(levels.length)} className="contents">
          <span
            role="img"
            aria-label={fill(text.path.endLabel, { project })}
            style={at(levels.length)}
            className={cn(
              "absolute flex aspect-square w-[24%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[22px] border-2 border-dashed bg-night",
              allDone ? "border-[#f5c518] text-[#f5c518]" : "border-white/20 text-white/45",
            )}
          >
            <Trophy size={28} strokeWidth={2.2} aria-hidden="true" />
          </span>
        </li>
      </ol>
    </section>
  );
}
