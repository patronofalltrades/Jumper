"use client";

import { useState } from "react";
import text from "@/content/ui/landing.json";
import { cn } from "@/lib/utils";

// "Meet Volt, your bench tutor" on the landing page (issue #152), after the tutor section of brilliant.org:
// a Wiring / Code switch changes the picture and the 4 cards. Each card is a feature that the app has today.

type Mode = "wiring" | "code";
const t = text.tutor;

const CHIP = ["bg-[#22d66b] text-[#04140a]", "bg-[#f5c518] text-[#1a1400]", "bg-[#123d24] text-[#22d66b]", "bg-white/10 text-white/80"];

export function TutorSection() {
  const [mode, setMode] = useState<Mode>("wiring");
  const cards = mode === "wiring" ? t.wiring : t.codeCards;

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col items-center gap-4 text-center">
        <h2 className="text-4xl leading-[1.02] font-bold tracking-tight text-balance sm:text-5xl">
          {t.title_start} <span className="text-[#22d66b]">{t.title_end}</span>
        </h2>
        <p className="max-w-xl text-lg text-white/65">{t.body}</p>
        <div role="tablist" aria-label="Tutor" className="inline-flex gap-1 rounded-full border border-white/10 bg-night-2 p-1">
          {(["wiring", "code"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              aria-controls="tutor-panel"
              onClick={() => setMode(m)}
              className={cn(
                "min-h-11 rounded-full px-6 text-[15px] font-semibold transition-colors",
                mode === m ? "bg-[#22d66b] text-[#04140a]" : "text-white/80 hover:text-white",
              )}
            >
              {t.modes[m]}
            </button>
          ))}
        </div>
      </div>

      <div id="tutor-panel" role="tabpanel" className="grid items-start gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <div className="mx-auto w-full max-w-[26rem] rounded-[1.25rem] border border-white/10 bg-night-2 p-5">{mode === "wiring" ? <PathPreview /> : <CodePreview />}</div>
        <ul className="grid gap-3.5 sm:grid-cols-2">
          {cards.map((card, i) => (
            <li key={card.title} className="flex flex-col gap-2 rounded-[1.25rem] border border-white/10 bg-night-2 p-5">
              <span className={cn("flex size-9 items-center justify-center rounded-xl font-mono text-xs font-semibold", CHIP[i])} aria-hidden="true">
                {card.chip}
              </span>
              <h3 className="text-lg leading-tight font-bold">{card.title}</h3>
              <p className="text-[15px] text-white/65">{card.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Header({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-full border border-white/10 bg-night py-2 pr-2 pl-5">
      <span className="text-[17px] font-bold">{title}</span>
      {children}
    </div>
  );
}

// The level path of the lobby design: square tiles on a dot grid (the holes of a breadboard), joined by wires.
const COLS = [60, 170, 280];
const PATH = [1, 2, 1, 0].map((c, i) => [COLS[c], 55 + i * 110] as const);
const R = 22;
const seg = ([ax, ay]: readonly [number, number], [bx, by]: readonly [number, number]) => {
  if (ax === bx) return `M${ax} ${ay} V${by}`;
  const dir = bx > ax ? 1 : -1;
  return `M${ax} ${ay} H${bx - dir * R} Q${bx} ${ay} ${bx} ${ay + R} V${by}`;
};
const SEGS = PATH.slice(1).map((p, i) => seg(PATH[i], p));
const CURRENT = 3;

function PathPreview() {
  return (
    <div className="flex flex-col gap-4">
      <Header title={t.path.title}>
        <span className="relative flex size-12 items-center justify-center" aria-hidden="true">
          <svg viewBox="0 0 36 36" className="absolute inset-0">
            <circle cx="18" cy="18" r="15" fill="none" stroke="#1c2622" strokeWidth="4" />
            <circle cx="18" cy="18" r="15" fill="none" stroke="#f5c518" strokeWidth="4" strokeLinecap="round" strokeDasharray="37.7 94.2" transform="rotate(-90 18 18)" />
          </svg>
          <span className="relative text-xs font-bold">{t.path.progress}</span>
        </span>
      </Header>
      <div
        role="img"
        aria-label={t.path.label}
        className="relative mx-auto aspect-[340/440] w-full max-w-[340px] bg-[radial-gradient(circle,#1a2420_3px,transparent_3.6px)] bg-[length:28px_28px] bg-[position:14px_14px]"
      >
        <svg viewBox="0 0 340 440" className="absolute inset-0 size-full" aria-hidden="true">
          <path d={SEGS.slice(CURRENT - 1).join(" ")} fill="none" stroke="#232d29" strokeWidth="8" strokeLinecap="round" />
          <path d={SEGS.slice(0, CURRENT - 1).join(" ")} fill="none" stroke="#22d66b" strokeWidth="8" strokeLinecap="round" />
        </svg>
        {PATH.map(([x, y], i) => {
          const n = i + 1;
          return (
            <span
              key={n}
              style={{ left: `${(x / 340) * 100}%`, top: `${(y / 440) * 100}%` }}
              className={cn(
                "absolute flex size-[22%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[22px] border-b-[7px]",
                n < CURRENT && "border-[#15a352] bg-[#22d66b] text-[#04140a]",
                n === CURRENT && "border-[#b8920c] bg-[#f5c518] text-[#1a1400] shadow-[0_0_0_6px_rgba(245,197,24,0.18),0_0_40px_rgba(245,197,24,0.45)]",
                n > CURRENT && "border border-b-[7px] border-[#2c3833] border-b-[#232d29] bg-[#161f1b] text-[#5b6862]",
              )}
            >
              {n < CURRENT && (
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              )}
              {n === CURRENT && (
                <svg width="30" height="30" viewBox="0 0 24 24">
                  <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" fill="currentColor" />
                </svg>
              )}
              {n > CURRENT && (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <rect x="5" y="11" width="14" height="9" rx="2" />
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                </svg>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function CodePreview() {
  return (
    <div className="flex flex-col gap-3.5">
      <Header title={t.code.title}>
        <span className="rounded-full bg-[#22d66b] px-4 py-2 text-sm font-bold text-[#04140a]">{t.code.run}</span>
      </Header>
      <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-night p-4 font-mono text-sm leading-[1.9]">
        {t.code.lines.map((line, i) => (
          <div key={line} className={cn(i === t.code.highlight && "-mx-2 rounded-lg bg-[#f5c518]/15 px-2 shadow-[inset_3px_0_0_#f5c518]")}>
            {line}
          </div>
        ))}
      </pre>
      <div className="flex items-end gap-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#f5c518] font-extrabold text-[#1a1400]" aria-hidden="true">
          V
        </span>
        <p className="rounded-2xl rounded-bl-sm border border-white/10 bg-white/5 px-3.5 py-3 text-[15px]">{t.code.explain}</p>
      </div>
    </div>
  );
}
