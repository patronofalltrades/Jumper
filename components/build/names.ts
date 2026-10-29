import text from "@/content/ui/build.json";
import type { Bench } from "@/lib/circuit/bench";
import type { Connection } from "@/lib/circuit/check";
import { partPins, type Part } from "@/lib/circuit/parts";
import { pinName } from "./guide";

// The plain names of the ends of a level rule, shared by the Check pop-up and the connection list (issue #92).

const names: Record<string, string> = { ...text.tray.parts, ...text.play.check.names };
const legs: Record<string, string> = text.play.check.legs;
const rails: Record<string, string> = text.railName;

/** A plain name for an endpoint of a level rule: "esp.GPIO4" → "GPIO 4", "mic1.WS" → "Mic WS", "led1.anode" → "LED + leg". */
export function endpointName(bench: Bench, parts: Part[], endpoint: string) {
  const [owner, pin] = endpoint.split(".");
  if (owner === bench.board.id) return pinName(pin);
  if (/^bb[A-Z]$/.test(owner)) return rails[pin] ?? pin;
  const part = parts.find((p) => p.id === owner);
  if (!part) return endpoint;
  const label = legs[pin] ?? partPins(bench, part).find((p) => p.name === pin)?.label ?? pin;
  return `${names[part.type] ?? owner} ${label}`;
}

const fill = (template: string, values: Record<string, string>) => template.replace(/\{(\w+)\}/g, (_, k: string) => values[k]);
const strayParts: Record<string, string> = text.play.check.strayParts;

/** The part and the pin of a stray pin (issue #104), in plain words: "r1.1" → "resistor", "esp.GPIO37" → "GPIO 37". */
function strayValues(bench: Bench, parts: Part[], { a, b }: Connection) {
  const type = parts.find((p) => p.id === a.split(".")[0])?.type;
  return { part: (type && strayParts[type]) ?? a, pin: endpointName(bench, parts, b) };
}

/** The fail text for a stray pin: "Oops! The resistor touches GPIO 37 on the board. …" */
export function strayText(bench: Bench, parts: Part[], connection: Connection) {
  return fill(text.play.check.stray_pin, strayValues(bench, parts, connection));
}

/** The connection list row for a stray pin: "The resistor must not touch GPIO 37". */
export function strayRow(bench: Bench, parts: Part[], connection: Connection) {
  return fill(text.connections.stray, strayValues(bench, parts, connection));
}
