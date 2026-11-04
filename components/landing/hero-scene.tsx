import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Volt } from "@/components/art/volt";

// The Remotion composition in the left panel of the hero (throwaway prototype). It plays one time:
// Volt drops in, and the speech bubble opens and types Volt's line.
// Each motion comes from useCurrentFrame() and interpolate(); CSS animations do not show correctly in Remotion.

export type IntroSceneProps = { volt: string };

const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const POP = { ...CLAMP, easing: Easing.spring({ damping: 12 }) };

export function IntroScene({ volt }: IntroSceneProps) {
  return (
    <AbsoluteFill className="hero-scene" style={{ fontFamily: "var(--font-display)" }}>
      <VoltDrop />
      <Bubble text={volt} />
    </AbsoluteFill>
  );
}

function VoltDrop() {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: 4, bottom: 2, width: 128, translate: `0px ${interpolate(frame, [0, 24], [-240, 0], POP)}px` }}>
      <Volt pose="happy" className="w-full" />
    </div>
  );
}

function Bubble({ text }: { text: string }) {
  const frame = useCurrentFrame();
  const chars = Math.round(interpolate(frame, [32, 70], [0, text.length], CLAMP));
  return (
    <div
      style={{
        position: "absolute",
        left: 140,
        top: 40,
        width: 300,
        transformOrigin: "0% 100%",
        scale: interpolate(frame, [20, 34], [0, 1], { ...POP, output: "perceptual-scale" }),
      }}
      className="rounded-2xl rounded-bl-sm border border-border bg-muted px-4 py-3 text-lg leading-snug font-semibold text-foreground"
    >
      {/* The full text holds the size; the typed part shows on top. */}
      <span style={{ visibility: "hidden" }}>{text}</span>
      <span style={{ position: "absolute", inset: "12px 16px" }}>{text.slice(0, chars)}</span>
    </div>
  );
}
