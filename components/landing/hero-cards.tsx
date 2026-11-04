import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { PerchFace } from "@/components/art/perch-face";
import { CARDS, conveyor, taskDone } from "@/components/landing/hero-timing";
import { cn } from "@/lib/utils";

// The Remotion composition under the hero of the landing page: a track of task cards on a tilted bench.
// The idea comes from the brilliant.org hero; the cards and their tasks are Jumper's. Night look (issue #152).
// In each step the track moves one card, the front card lifts and glows, the cursor taps it, and the task plays.
// The frame drives all motion (useCurrentFrame + interpolate). The track loops after CARDS.kinds cards.

export type CardKind = "place" | "wire" | "code" | "check" | "face";
export type CardText = { kind: CardKind; label: string; title: string };
export type CardsSceneProps = { cards: CardText[]; check: string; code: { line1: string; before: string; blank: string; after: string; line3: string } };

const W = 240;
const H = 290;
/** The distance between two cards on the track. */
const GAP = 262;
const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const EASE = { ...CLAMP, easing: Easing.bezier(0.16, 1, 0.3, 1) };

export function CardsScene(props: CardsSceneProps) {
  const frame = useCurrentFrame();
  const { active, local, position } = conveyor(frame);
  const ids = Array.from({ length: 8 }, (_, k) => active - 4 + k);
  return (
    <AbsoluteFill style={{ fontFamily: "var(--font-display)", perspective: 1800 }}>
      {/* The bench plane: cards go up and to the right, as on a slope. */}
      <div
        style={{
          position: "absolute",
          left: CARDS.width / 2 - W / 2 - 40,
          top: CARDS.height / 2 - H / 2 + 46,
          transformStyle: "preserve-3d",
          transform: "rotateX(22deg) rotateY(-24deg) rotateZ(-4deg)",
        }}
      >
        {ids.map((id) => {
          const slot = id - position;
          const front = id === active;
          const lift = front ? interpolate(local, [CARDS.move - 6, CARDS.move + 8], [0, 1], EASE) * interpolate(local, [CARDS.step - 8, CARDS.step], [1, 0], CLAMP) : 0;
          const kind = ((id % CARDS.kinds) + CARDS.kinds) % CARDS.kinds;
          return (
            <div
              key={id}
              style={{
                position: "absolute",
                width: W,
                height: H,
                translate: `${slot * GAP}px ${slot * -30 - lift * 22}px ${lift * 70}px`,
                opacity: interpolate(Math.abs(slot), [2.6, 3.4], [1, 0], CLAMP),
                zIndex: Math.round(slot * 10) + 100,
              }}
            >
              <Card text={props.cards[kind]} done={taskDone(id, frame)} glow={lift} {...props} />
              {front && <Cursor local={local} />}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

function Card({ text, done, glow, check, code }: { text: CardText; done: number; glow: number } & Omit<CardsSceneProps, "cards">) {
  return (
    <div
      className="flex h-full flex-col rounded-[22px] border border-white/10 bg-night-2 p-4 text-white"
      style={{
        boxShadow: `0 0 0 ${3 * glow}px #22d66b, 0 ${18 + glow * 20}px ${40 + glow * 30}px rgba(0,0,0,${0.45 + glow * 0.15}), 0 0 ${70 * glow}px rgba(34,214,107,${0.4 * glow}), inset 0 1px 0 rgba(255,255,255,0.08)`,
      }}
    >
      <p className="font-mono text-[11px] font-medium tracking-wide text-white/55 uppercase">{text.label}</p>
      <p className="mt-1 text-[17px] leading-tight font-bold">{text.title}</p>
      <div className="relative mt-3 flex flex-1 items-center justify-center overflow-hidden rounded-2xl border border-white/5 bg-white/[0.04]">
        {text.kind === "place" && <MiniBoard led={done} />}
        {text.kind === "wire" && <MiniBoard led={1} wire={done} />}
        {text.kind === "code" && <Code done={done} {...code} />}
        {text.kind === "check" && <CheckPill done={done} label={check} />}
        {text.kind === "face" && <Face done={done} />}
        <Tick done={done} />
      </div>
    </div>
  );
}

const holeX = (c: number) => 16 + c * 16;
const ROWS = [20, 34, 48, 62, 92, 106, 120, 134];

// A small breadboard: an LED goes in (led 0 → 1), then a wire draws from the board pin (wire 0 → 1).
function MiniBoard({ led, wire = 0 }: { led: number; wire?: number }) {
  return (
    <svg viewBox="0 0 196 152" className="w-[92%]" aria-hidden>
      <rect x="1" y="1" width="194" height="150" rx="10" fill="#f3efe4" stroke="#ccd6db" strokeWidth="2" />
      <rect x="6" y="72" width="184" height="10" rx="3" fill="#e2dccb" />
      {ROWS.flatMap((y) => Array.from({ length: 11 }, (_, c) => <rect key={`${c}-${y}`} x={holeX(c) - 2.5} y={y - 2.5} width="5" height="5" rx="1" fill="#566874" opacity="0.5" />))}
      <rect x="8" y="42" width="58" height="68" rx="6" fill="#1f7a55" stroke="#145a3e" strokeWidth="2" />
      <rect x="20" y="54" width="34" height="26" rx="3" fill="#c9d4da" stroke="#9fb0ba" strokeWidth="2" />
      <g opacity={interpolate(led, [0, 0.3], [0, 1], CLAMP)} style={{ translate: `0px ${interpolate(led, [0, 1], [-60, 0], { ...CLAMP, easing: Easing.spring({ damping: 11 }) })}px` }}>
        <line x1={holeX(8)} y1="48" x2={holeX(8)} y2="34" stroke="#9fb0ba" strokeWidth="3" />
        <line x1={holeX(9)} y1="48" x2={holeX(9)} y2="34" stroke="#9fb0ba" strokeWidth="3" />
        <circle cx={holeX(8) + 8} cy="28" r="20" fill="#f2b705" opacity={wire >= 1 ? 0.5 : 0} />
        <path d={`M${holeX(8) - 1} 36 V26 a9 9 0 0 1 18 0 V36 Z`} fill={wire >= 1 ? "#f2b705" : "#c9412f"} stroke="#13202a" strokeWidth="2" />
      </g>
      {wire > 0 && (
        <path
          d={`M${holeX(2)} 20 C ${holeX(2)} -4, ${holeX(8)} -6, ${holeX(8)} 20`}
          fill="none"
          stroke="#1f62c4"
          strokeWidth="4"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="1"
          strokeDashoffset={1 - wire}
        />
      )}
    </svg>
  );
}

function Code({ done, line1, before, blank, after, line3 }: { done: number } & CardsSceneProps["code"]) {
  const filled = done > 0.4;
  return (
    <pre className="w-full px-3 font-mono text-[11.5px] leading-7 text-white/85">
      {line1}
      {"\n  "}
      {before}
      <span
        className={cn("inline-block min-w-10 rounded-md border-2 px-1 text-center leading-5", filled ? "border-[#22d66b] bg-[#22d66b]/15 font-bold text-[#22d66b]" : "border-dashed border-white/25")}
        style={{ scale: filled ? interpolate(done, [0.4, 0.7], [1.25, 1], CLAMP) : 1 }}
      >
        {filled ? blank : " "}
      </span>
      {after}
      {"\n"}
      {line3}
    </pre>
  );
}

function CheckPill({ done, label }: { done: number; label: string }) {
  const on = done > 0.15;
  return (
    <div
      className={cn("flex h-14 w-40 items-center justify-center gap-2 rounded-full border-b-4 text-lg font-extrabold", on ? "border-[#15a352] bg-[#22d66b] text-[#04140a] shadow-[0_0_30px_rgba(34,214,107,0.4)]" : "border-white/15 bg-night text-white")}
      style={{ scale: interpolate(done, [0, 0.12, 0.3], [1, 0.88, 1], CLAMP) }}
    >
      {on && <span aria-hidden>✓</span>}
      {label}
    </div>
  );
}

function Face({ done }: { done: number }) {
  return (
    <div className="relative w-32" style={{ scale: interpolate(done, [0, 0.4, 1], [0.9, 1.06, 1], CLAMP) }}>
      <div className="absolute inset-4 rounded-full" style={{ background: "#f5c518", filter: "blur(26px)", opacity: done * 0.55 }} />
      <div style={{ opacity: interpolate(done, [0, 0.3], [0.45, 1], CLAMP), filter: `grayscale(${1 - done})` }}>
        <PerchFace className="relative w-full" />
      </div>
    </div>
  );
}

// The green badge on a card when its task is done.
function Tick({ done }: { done: number }) {
  return (
    <span
      className="absolute top-2 right-2 grid size-7 place-items-center rounded-full bg-[#22d66b] text-sm font-black text-[#04140a]"
      style={{ scale: interpolate(done, [0.75, 1], [0, 1], { ...CLAMP, easing: Easing.spring({ damping: 10 }), output: "perceptual-scale" }) }}
    >
      ✓
    </span>
  );
}

// The cursor comes in from the bottom right, taps the card, and goes away.
function Cursor({ local }: { local: number }) {
  const tap = interpolate(local, [34, 37, 41], [1, 0.82, 1], CLAMP);
  return (
    <svg
      viewBox="0 0 28 32"
      className="absolute"
      style={{
        width: 40,
        left: W * 0.55,
        top: H * 0.6,
        zIndex: 5,
        translate: `${interpolate(local, [CARDS.move, 34], [140, 0], EASE)}px ${interpolate(local, [CARDS.move, 34], [110, 0], EASE)}px`,
        opacity: interpolate(local, [CARDS.move, CARDS.move + 6, CARDS.step - 10, CARDS.step - 2], [0, 1, 1, 0], CLAMP),
        scale: tap,
        filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.6))",
      }}
      aria-hidden
    >
      <path d="M3 2 L25 18 L15 19.5 L20 29 L15.5 31 L10.5 21.5 L3 28 Z" fill="#fff" stroke="#070b09" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
