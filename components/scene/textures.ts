import { CanvasTexture } from "three";
import uno from "@/content/parts/arduino-uno.json";
import { BOARD, COLUMNS, columnZ, MAIN_ROWS, RAILS, unoAt, type Bench } from "@/lib/circuit/bench";

// Printed tops for the breadboards, the ESP32-S3 and the Uno, drawn on a canvas in bench units (1 unit = 1 hole pitch).
// Canvas x is bench x, canvas y is bench z, so the text reads upright from the default camera.

const PX = 40;
const RED = "#D63A2F";
const BLUE = "#2F6FD6";

function monoFont() {
  const family = getComputedStyle(document.documentElement).getPropertyValue("--font-plex-mono").trim();
  return family || "Menlo, monospace";
}

function canvasFor(width: number, depth: number, x0: number, z0: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * PX);
  canvas.height = Math.round(depth * PX);
  const g = canvas.getContext("2d")!;
  return { canvas, g, X: (x: number) => (x - x0) * PX, Z: (z: number) => (z - z0) * PX };
}

/**
 * The top of one 400-hole breadboard whose row a is at bench x = `x0`. `letter` (A, B) goes large over the center gap,
 * at the end near the learner (issue #100).
 */
export function drawBreadboard(x0: number, letter: string): CanvasTexture {
  const left = x0 + BOARD.centerX - BOARD.width / 2;
  const top = -BOARD.length / 2;
  const { canvas, g, X, Z } = canvasFor(BOARD.width, BOARD.length, left, top);
  const font = monoFont();

  g.fillStyle = "#EEF0F1";
  g.fillRect(0, 0, canvas.width, canvas.height);
  // Center gap
  g.fillStyle = "#D7DCDF";
  g.fillRect(X(x0 + 4.95), 0, 1.1 * PX, canvas.height);
  g.fillStyle = "#C6CCD0";
  g.fillRect(X(x0 + 5.44), 0, 0.12 * PX, canvas.height);
  // Rail lines: red beside each + rail, blue beside each − rail
  const line = (x: number, color: string) => {
    g.fillStyle = color;
    g.fillRect(X(x) - 1.5, Z(columnZ(0.3)), 3, (COLUMNS - 0.6) * PX);
  };
  line(x0 + RAILS["L+"] - 0.6, RED);
  line(x0 + RAILS["L-"] + 0.6, BLUE);
  line(x0 + RAILS["R-"] - 0.6, BLUE);
  line(x0 + RAILS["R+"] + 0.6, RED);

  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = "#7B868D";
  g.font = `600 ${0.5 * PX}px ${font}`;
  const rowX: Record<string, number> = { a: 0, b: 1, c: 2, d: 3, e: 4, f: 7, g: 8, h: 9, i: 10, j: 11 };
  for (const r of MAIN_ROWS) {
    g.fillText(r, X(x0 + rowX[r]), Z(columnZ(0)));
    g.fillText(r, X(x0 + rowX[r]), Z(columnZ(COLUMNS + 1)));
  }
  for (const c of [1, 5, 10, 15, 20, 25, 30]) {
    g.fillText(String(c), X(x0 - 1.15), Z(columnZ(c)));
    g.fillText(String(c), X(x0 + 12.15), Z(columnZ(c)));
  }
  g.font = `700 ${0.7 * PX}px ${font}`;
  g.fillStyle = RED;
  g.fillText("+", X(x0 + RAILS["L+"]), Z(columnZ(0)));
  g.fillText("+", X(x0 + RAILS["R+"]), Z(columnZ(0)));
  g.fillStyle = BLUE;
  g.fillText("−", X(x0 + RAILS["L-"]), Z(columnZ(0)));
  g.fillText("−", X(x0 + RAILS["R-"]), Z(columnZ(0)));

  g.fillStyle = "#4D565D";
  g.font = `800 ${1.5 * PX}px ${font}`;
  g.fillText(letter, X(x0 + 5.5), Z(columnZ(0) - 0.05));

  return new CanvasTexture(canvas);
}

/** The top of the ESP32-S3-DevKitC-1: the PCB, the gold pads and a label beside each pin. */
export function drawEsp(bench: Bench): CanvasTexture {
  const { x0, x1, z0, z1 } = bench.board.outline;
  const { canvas, g, X, Z } = canvasFor(x1 - x0, z1 - z0, x0, z0);
  const font = monoFont();

  g.fillStyle = "#1D2933";
  g.fillRect(0, 0, canvas.width, canvas.height);

  const mid = (x0 + x1) / 2;
  for (const pin of bench.pins) {
    const hole = bench.byId.get(pin.hole)!;
    g.fillStyle = "#C9A646";
    g.beginPath();
    g.arc(X(hole.x), Z(hole.z), 0.3 * PX, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#F2F4F5";
    g.font = `600 ${0.46 * PX}px ${font}`;
    g.textBaseline = "middle";
    const inward = hole.x < mid ? 1 : -1;
    g.textAlign = inward > 0 ? "left" : "right";
    g.fillText(pin.label, X(hole.x + inward * 0.55), Z(hole.z));
  }

  g.save();
  g.translate(X(mid), Z(-1.5));
  g.rotate(-Math.PI / 2);
  g.textAlign = "center";
  g.fillStyle = "#F2F4F5";
  g.font = `700 ${0.62 * PX}px ${font}`;
  g.fillText("ESP32-S3-DevKitC-1", 0, 0);
  g.restore();

  return new CanvasTexture(canvas);
}

/** A socket of the Uno headers: its place on the bench, its name, and the label printed beside it. */
export type UnoSocket = { x: number; z: number; name: string; label: string };

/** The sockets of each header of the Uno on this bench, with the sockets that Jumper does not use (content/parts/arduino-uno.json). */
export function unoHeaders(bench: Bench): { z: number; sockets: UnoSocket[] }[] {
  const { outline } = bench.board;
  const labels: Record<string, string> = uno.labels;
  return uno.headers.map((h) => ({
    z: unoAt(outline, 0, h.v).z,
    sockets: h.pins.map((name, k) => ({ ...unoAt(outline, h.u + k, h.v), name, label: labels[name] ?? name })),
  }));
}

/** The top of the Arduino Uno: the teal PCB, a label beside each socket, the names of the headers, and "UNO". */
export function drawUno(bench: Bench): CanvasTexture {
  const { outline } = bench.board;
  const { x0, x1, z0, z1 } = outline;
  const { canvas, g, X, Z } = canvasFor(x1 - x0, z1 - z0, x0, z0);
  const font = monoFont();

  g.fillStyle = "#00878F";
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.strokeStyle = "rgba(255,255,255,0.18)";
  g.lineWidth = 2;
  g.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

  // The labels stand across each header, on the side toward the middle of the board, as on a real Uno.
  const mid = (z0 + z1) / 2;
  const headers = unoHeaders(bench);
  g.textBaseline = "middle";
  g.fillStyle = "#F2F4F5";
  g.font = `600 ${0.46 * PX}px ${font}`;
  for (const { z, sockets } of headers) {
    const inward = z < mid ? 1 : -1;
    for (const s of sockets) {
      g.save();
      g.translate(X(s.x), Z(s.z + inward * 0.75));
      g.rotate(-Math.PI / 2);
      g.textAlign = inward > 0 ? "right" : "left";
      g.fillText(s.label, 0, 0);
      g.restore();
    }
  }

  // The names of the headers, along each header, inside the labels.
  const caption = (text: string, x: number, z: number) => {
    g.textAlign = "center";
    g.fillStyle = "rgba(242,244,245,0.8)";
    g.font = `700 ${0.5 * PX}px ${font}`;
    g.fillText(text, X(x), Z(z));
  };
  const middle = (sockets: UnoSocket[]) => (sockets[0].x + sockets[sockets.length - 1].x) / 2;
  caption("DIGITAL (PWM ~)", (middle(headers[0].sockets) + middle(headers[1].sockets)) / 2, headers[0].z + 3.6);
  caption("POWER", middle(headers[2].sockets), headers[2].z - 3.6);
  caption("ANALOG IN", middle(headers[3].sockets), headers[3].z - 3.6);
  // The L light on pin 13: its name beside it (issue #58).
  const led = unoAt(outline, uno.led_l.u, uno.led_l.v);
  caption("L", led.x + 1.1, led.z);

  const logo = unoAt(outline, 15, 13);
  g.textAlign = "center";
  g.fillStyle = "#F2F4F5";
  g.font = `800 ${2.4 * PX}px ${font}`;
  g.fillText("UNO", X(logo.x), Z(logo.z));
  g.font = `600 ${0.6 * PX}px ${font}`;
  g.fillText("Arduino Uno R3", X(logo.x), Z(logo.z + 1.8));

  return new CanvasTexture(canvas);
}

/** Size of the ESP32-S3-WROOM-1 module, in hole pitches. */
export const SHIELD = { width: 5.6, length: 9 } as const;

/** The metal shield of the ESP32-S3-WROOM-1 module. */
export function drawShield(): CanvasTexture {
  const { canvas, g } = canvasFor(SHIELD.width, SHIELD.length, 0, 0);
  const grd = g.createLinearGradient(0, 0, canvas.width, canvas.height);
  grd.addColorStop(0, "#C9CFD4");
  grd.addColorStop(1, "#A9B1B8");
  g.fillStyle = grd;
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.save();
  g.translate(canvas.width / 2, canvas.height / 2);
  g.rotate(-Math.PI / 2);
  g.fillStyle = "#4D565D";
  g.textAlign = "center";
  g.font = `700 ${0.62 * PX}px ${monoFont()}`;
  g.fillText("ESP32-S3-WROOM-1", 0, 0);
  g.font = `500 ${0.45 * PX}px ${monoFont()}`;
  g.fillText("Wi-Fi · BLE", 0, 0.75 * PX);
  g.restore();
  return new CanvasTexture(canvas);
}

/** The top of a module: the PCB color, a gold pad and a label at each pin, and the name of the part. */
export function drawModule(
  outline: { x0: number; x1: number; z0: number; z1: number },
  pins: { x: number; z: number; label: string }[],
  color: string,
  title: string,
): CanvasTexture {
  const { x0, x1, z0, z1 } = outline;
  const { canvas, g, X, Z } = canvasFor(x1 - x0, z1 - z0, x0, z0);
  const font = monoFont();

  g.fillStyle = color;
  g.fillRect(0, 0, canvas.width, canvas.height);

  // Labels go on the side of the pad with more room, so that they stay on the board.
  const mid = (x0 + x1) / 2;
  for (const pin of pins) {
    g.fillStyle = "#C9A646";
    g.beginPath();
    g.arc(X(pin.x), Z(pin.z), 0.28 * PX, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#F2F4F5";
    g.font = `600 ${0.42 * PX}px ${font}`;
    g.textBaseline = "middle";
    const right = pin.x <= mid;
    g.textAlign = right ? "left" : "right";
    g.fillText(pin.label, X(pin.x + (right ? 0.42 : -0.42)), Z(pin.z));
  }

  // The name, along the pins: beside a single row of pads, or in the middle between two rows.
  if (!title) return new CanvasTexture(canvas);
  const oneRow = new Set(pins.map((p) => p.x)).size === 1;
  g.save();
  g.fillStyle = "rgba(242,244,245,0.75)";
  g.font = `700 ${0.36 * PX}px ${font}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.translate(X(oneRow ? x0 + 0.3 : mid), Z((z0 + z1) / 2));
  g.rotate(-Math.PI / 2);
  g.fillText(title, 0, 0);
  g.restore();

  return new CanvasTexture(canvas);
}
