"use client";

import type { KeyboardEvent, ReactNode } from "react";

// The schematic of the LED lesson (lesson af-led, TRD addendum 6.5): pin 13 → resistor → LED → GND, with the 5 V wire to
// the + line. A person drew it; it is a reference view and it does not read the board. Each terminal and each net has
// an id (`sid`), and the map in content/lessons/af-led.json names these ids. tests/lesson-content.test.ts makes sure
// that each id of the map is in this file.

export type SchematicProps = {
  /** The sids that show the selection. */
  selected: ReadonlySet<string>;
  /** The label of an element, by sid. An element with no label cannot be selected. */
  labels: ReadonlyMap<string, string>;
  onSelect: (sid: string) => void;
  /** The text for a screen reader: the name of the drawing. */
  title: string;
  /** The color of each net, by sid: the same color as the connection on the 3D board and on the photo. */
  colors?: ReadonlyMap<string, string>;
  /** The color of the selection: a selected terminal has a ring in this color. */
  mark?: string;
};

const WIRE = "var(--ink)";
const MARK = "var(--probe)";

export function SchematicAfLed({ selected, labels, onSelect, title, colors, mark = MARK }: SchematicProps) {
  /** A net or a terminal that the learner can select: a button for the pointer and for the keyboard. */
  const pick = (sid: string, children: (on: boolean) => ReactNode) => {
    const label = labels.get(sid);
    const on = selected.has(sid);
    if (!label) return <g key={sid}>{children(on)}</g>;
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      onSelect(sid);
    };
    return (
      <g key={sid} data-sid={sid} role="button" tabIndex={0} aria-label={label} aria-pressed={on} onClick={() => onSelect(sid)} onKeyDown={key} className="cursor-pointer outline-none [&:focus-visible_.focus]:opacity-100">
        <title>{label}</title>
        {children(on)}
      </g>
    );
  };

  /** A net: the line, a wide line that takes the click, and a dashed outline when it is selected. */
  const net = (sid: string, d: string) =>
    pick(sid, (on) => {
      const color = colors?.get(sid);
      return (
      <>
        {on && <path d={d} fill="none" stroke={color ?? MARK} strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" opacity={0.3} />}
        <path className="focus" d={d} fill="none" stroke={MARK} strokeWidth={9} strokeDasharray="2 6" strokeLinecap="round" opacity={0} />
        <path d={d} fill="none" stroke={on ? (color ?? MARK) : (color ?? WIRE)} strokeWidth={on ? 5 : color ? 3 : 2} strokeDasharray={on && !color ? "9 4" : undefined} strokeLinecap="round" strokeLinejoin="round" />
        <path d={d} fill="none" stroke="transparent" strokeWidth={18} />
      </>
      );
    });

  /** A terminal: a dot, with a ring when it is selected. */
  const terminal = (sid: string, x: number, y: number) =>
    pick(sid, (on) => (
      <>
        <circle className="focus" cx={x} cy={y} r={13} fill="none" stroke={MARK} strokeWidth={2} strokeDasharray="2 4" opacity={0} />
        {on && <circle cx={x} cy={y} r={12} fill="none" stroke={mark} strokeWidth={3} />}
        <circle cx={x} cy={y} r={5.5} fill={on ? mark : "var(--panel)"} stroke={on ? mark : WIRE} strokeWidth={2} />
        <circle cx={x} cy={y} r={14} fill="transparent" />
      </>
    ));

  const text = "fill-foreground font-mono text-[11px]";
  const small = "fill-muted-foreground font-mono text-[10px]";

  return (
    <svg viewBox="0 0 520 290" role="group" aria-label={title} className="h-auto w-full">
      {/* The Arduino Uno */}
      <rect x={16} y={36} width={104} height={228} rx={8} fill="var(--panel-2)" stroke={WIRE} strokeWidth={2} />
      <text x={68} y={150} textAnchor="middle" className="fill-foreground text-[13px] font-bold">
        Arduino
      </text>
      <text x={68} y={166} textAnchor="middle" className="fill-foreground text-[13px] font-bold">
        Uno
      </text>
      <text x={102} y={84} textAnchor="end" className={text}>
        13
      </text>
      <text x={102} y={194} textAnchor="end" className={text}>
        5V
      </text>
      <text x={102} y={244} textAnchor="end" className={text}>
        GND
      </text>

      {/* The nets. The LED net goes back to GND along the − line, so it comes first: the GND net is on top of it. */}
      {net("n-led-gnd", "M 392 80 H 480 V 240 H 300")}
      {net("n-gnd-rail", "M 120 240 H 300")}
      {net("n-d13-r1", "M 120 80 H 196")}
      {net("n-r1-led", "M 276 80 H 336")}
      {net("n-5v-rail", "M 120 190 H 240")}

      {/* The resistor */}
      <path d="M 196 80 l 6 -10 l 11 20 l 11 -20 l 11 20 l 11 -20 l 11 20 l 11 -20 l 8 10" fill="none" stroke={WIRE} strokeWidth={2} strokeLinejoin="round" />
      <text x={236} y={56} textAnchor="middle" className={text}>
        Resistor
      </text>

      {/* The LED: the triangle points from the long leg (+) to the short leg (−). */}
      <path d="M 336 80 H 350 M 378 80 H 392" stroke={WIRE} strokeWidth={2} />
      <path d="M 350 64 V 96 L 378 80 Z" fill="var(--panel)" stroke={WIRE} strokeWidth={2} strokeLinejoin="round" />
      <path d="M 378 64 V 96" stroke={WIRE} strokeWidth={2.5} />
      <path d="M 366 56 l 9 -11 m -1 7 l 1 -7 l -7 1 M 378 60 l 9 -11 m -1 7 l 1 -7 l -7 1" fill="none" stroke={WIRE} strokeWidth={1.5} strokeLinecap="round" />
      <text x={364} y={36} textAnchor="middle" className={text}>
        LED
      </text>
      <text x={336} y={104} textAnchor="middle" className={small}>
        +
      </text>
      <text x={394} y={104} textAnchor="middle" className={small}>
        −
      </text>

      {/* The lines of the breadboard */}
      <path d="M 240 190 H 330" stroke={WIRE} strokeWidth={5} strokeLinecap="round" />
      <text x={288} y={178} textAnchor="middle" className={small}>
        + line (5 V)
      </text>
      <text x={390} y={258} textAnchor="middle" className={small}>
        − line (ground)
      </text>

      {/* The terminals */}
      {terminal("t-uno-d13", 120, 80)}
      {terminal("t-r1-1", 196, 80)}
      {terminal("t-r1-2", 276, 80)}
      {terminal("t-led1-anode", 336, 80)}
      {terminal("t-led1-cathode", 392, 80)}
      {terminal("t-uno-5v", 120, 190)}
      {terminal("t-bba-plus", 240, 190)}
      {terminal("t-uno-gnd", 120, 240)}
      {terminal("t-bba-minus", 300, 240)}
    </svg>
  );
}
