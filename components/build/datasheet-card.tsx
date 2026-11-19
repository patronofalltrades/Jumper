"use client";

import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import text from "@/content/ui/build.json";
import { datasheetPins, pinoutGrid } from "@/lib/circuit/datasheet";
import { FOOTPRINTS, type ModuleType } from "@/lib/circuit/modules";
import { cn } from "@/lib/utils";

const t = text.datasheet;
const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k]));

/**
 * The datasheet card of a module (issue #182): what it does, its power, the pinout and one line for each pin,
 * with a link to the real datasheet. The learner reads the pins before wiring, as at a real bench.
 */
export function DatasheetButton({ type, partName }: { type: ModuleType; partName: string }) {
  const part = FOOTPRINTS[type];
  const grid = pinoutGrid(type);
  const pins = datasheetPins(type);

  return (
    <Dialog>
      <DialogTrigger
        className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-b-4 border-border bg-card px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-0.5 active:border-b-2"
        aria-label={fill(t.button_label, { part: partName })}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 4h11l5 5v11H4zM14 4v6h6M8 13h8M8 17h5" />
        </svg>
        {t.button}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <div>
          <DialogTitle>{part.title}</DialogTitle>
          <DialogDescription className="mt-1">{part.datasheet.summary}</DialogDescription>
        </div>

        <p className="rounded-xl bg-muted px-3 py-2 text-sm">
          <span className="font-semibold">{t.supply}: </span>
          {part.datasheet.supply}
        </p>

        <section>
          <h3 className="text-sm font-semibold">{t.pinout}</h3>
          <div className="mt-2 overflow-x-auto rounded-xl p-3" style={{ background: part.body.color }}>
            <div className="mx-auto grid w-max gap-1.5" style={{ gridTemplateColumns: `repeat(${grid[0].length}, minmax(2.75rem, auto))` }}>
              {grid.flatMap((row, r) =>
                row.map((cell, c) =>
                  cell ? (
                    <span
                      key={`${r}-${c}`}
                      className={cn(
                        "flex min-h-9 flex-col items-center justify-center rounded-md bg-card px-1 font-mono text-[11px] font-semibold",
                        cell.terminal && "border-2 border-dashed border-border",
                      )}
                    >
                      <span aria-hidden="true" className="mb-0.5 size-2 rounded-full bg-[#c9a227]" />
                      {cell.label}
                    </span>
                  ) : (
                    <span key={`${r}-${c}`} aria-hidden="true" />
                  ),
                ),
              )}
            </div>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {t.pinout_note} {pins.some((p) => p.terminal) && t.terminal_note}
          </p>
        </section>

        <section>
          <h3 className="text-sm font-semibold">{t.pins}</h3>
          <table className="mt-2 w-full text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="py-1 pr-3 font-semibold">
                  {t.pin}
                </th>
                <th scope="col" className="py-1 font-semibold">
                  {t.does}
                </th>
              </tr>
            </thead>
            <tbody>
              {pins.map((pin) => (
                <tr key={pin.name} className="border-t border-border align-top">
                  <th scope="row" className="py-1.5 pr-3 font-mono text-xs font-semibold whitespace-nowrap">
                    {pin.label}
                    {pin.legs > 1 && <span className="block font-sans font-normal text-muted-foreground">{fill(t.legs, { n: pin.legs })}</span>}
                  </th>
                  <td className="py-1.5">{pin.does}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <a href={part.datasheet.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-primary underline underline-offset-4">
            {t.open}
          </a>
          <DialogClose className="min-h-11 rounded-xl border border-b-4 border-border bg-card px-4 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {t.close}
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
