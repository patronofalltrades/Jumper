import { eyeScale, keyframe, type Emotion } from "@/lib/game/alive";

// The face of Perch on the 240 × 240 screen (issue #86): the approved design, drawn on a canvas. The shapes and colors are
// the ones of the approved SVGs. The SVG animations are in `keyframe`, so the face moves in the render loop.

const AMBER = "#F2B705";
const CHEEK = "#E26A5B";
const TEAR = "#2F6FD6";
const SCREEN = "#0E1114";

type Ctx = CanvasRenderingContext2D;

const rect = (c: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string) => {
  c.fillStyle = fill;
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fill();
};
const oval = (c: Ctx, x: number, y: number, rx: number, ry: number, fill: string) => {
  c.fillStyle = fill;
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fill();
};
const line = (c: Ctx, d: string) => {
  c.strokeStyle = AMBER;
  c.lineWidth = 7;
  c.lineCap = "round";
  c.stroke(new Path2D(d));
};
const smile = (c: Ctx, d = "M96 166 Q120 182 144 166") => line(c, d);
const cheeks = (c: Ctx) => {
  c.globalAlpha = 0.55;
  oval(c, 52, 150, 9, 9, CHEEK);
  oval(c, 188, 150, 9, 9, CHEEK);
  c.globalAlpha = 1;
};
const eyes = (c: Ctx, y = 80, h = 56) => {
  rect(c, 62, y, 38, h, 19, AMBER);
  rect(c, 140, y, 38, h, 19, AMBER);
};
const openMouth = (c: Ctx) => {
  c.fillStyle = AMBER;
  c.fill(new Path2D("M92 158 Q120 192 148 158 Z"));
};
const star = (c: Ctx, cx: number, cy: number, scale: number) => {
  c.save();
  c.translate(cx, cy);
  c.scale(scale, scale);
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 24 : 10;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    c.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  c.closePath();
  c.fillStyle = AMBER;
  c.fill();
  c.restore();
};

/** Draws the face of an emotion at time `t` (seconds). `volume` (0 to 1) makes the eyes of Listening grow. */
export function drawFace(c: Ctx, emotion: Emotion, t: number, volume: number) {
  c.clearRect(0, 0, 240, 240);
  rect(c, 0, 0, 240, 240, 18, "#25292D");
  rect(c, 8, 8, 224, 224, 12, SCREEN);

  switch (emotion) {
    case "idle": {
      const blink = [0, 0.9, 0.94, 0.98, 1];
      eyes(c, keyframe([80, 80, 106, 80, 80], 3.5, t, blink), keyframe([56, 56, 4, 56, 56], 3.5, t, blink));
      smile(c);
      cheeks(c);
      break;
    }
    case "happy":
      smile(c, "M62 116 Q81 92 100 116");
      smile(c, "M140 116 Q159 92 178 116");
      openMouth(c);
      cheeks(c);
      break;
    case "talking":
      eyes(c);
      oval(c, 120, 170, 18, keyframe([4, 14, 6, 12, 4], 0.6, t), AMBER);
      cheeks(c);
      break;
    case "listening": {
      const k = eyeScale(volume);
      const h = keyframe([60, 70, 62, 72, 60], 1.2, t) * k;
      const w = 46 * k;
      // The eyes grow around their middle.
      for (const cx of [81, 159]) rect(c, cx - w / 2, 74 + h / (2 * k) - h / 2, w, h, w / 2, AMBER);
      oval(c, 120, 170, 7, 7, AMBER);
      break;
    }
    case "thinking":
      rect(c, 62, 96, 38, 40, 19, AMBER);
      rect(c, 140, 96, 38, 40, 19, AMBER);
      c.save();
      c.translate(81, 84);
      c.rotate((-8 * Math.PI) / 180);
      rect(c, -21, -4, 42, 8, 4, AMBER);
      c.restore();
      smile(c, "M104 170 L136 166");
      for (let i = 0; i < 3; i++) {
        c.globalAlpha = keyframe([0, 1, 0], 1.2, t, undefined, i * 0.3);
        oval(c, 170 + i * 14, 56 - i * 10, 3 + i, 3 + i, AMBER);
      }
      c.globalAlpha = 1;
      break;
    case "surprised":
      oval(c, 81, 104, 24, 24, AMBER);
      oval(c, 159, 104, 24, 24, AMBER);
      oval(c, 81, 104, 9, 9, SCREEN);
      oval(c, 159, 104, 9, 9, SCREEN);
      oval(c, 120, 172, 12, 15, AMBER);
      break;
    case "sad":
      rect(c, 62, 92, 38, 44, 19, AMBER);
      rect(c, 140, 92, 38, 44, 19, AMBER);
      smile(c, "M96 176 Q120 160 144 176");
      c.save();
      c.translate(0, keyframe([0, 18, 0], 1.6, t));
      c.fillStyle = TEAR;
      c.fill(new Path2D("M70 140 q6 14 0 20 q-6 -6 0 -20"));
      c.restore();
      break;
    case "sleepy":
      smile(c, "M62 112 Q81 124 100 112");
      smile(c, "M140 112 Q159 124 178 112");
      oval(c, 120, 168, 8, 5, AMBER);
      for (let i = 0; i < 3; i++) {
        c.globalAlpha = keyframe([0, 1, 0], 2, t, undefined, i * 0.5);
        c.fillStyle = AMBER;
        c.font = `700 ${14 + i * 5}px sans-serif`;
        c.fillText("z", 176 + i * 14, 70 - i * 16);
      }
      c.globalAlpha = 1;
      break;
    case "excited": {
      const scale = keyframe([1, 1.12, 1], 0.8, t);
      star(c, 81, 108, scale);
      star(c, 159, 108, scale);
      openMouth(c);
      cheeks(c);
      break;
    }
  }
}
