import text from "@/content/ui/build.json";
import type { Bench } from "@/lib/circuit/bench";
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
