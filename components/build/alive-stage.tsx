"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { aliveText, effectsFor, fallbackLevel, meterLevel, momentMs, passTriggers, showMs, voiceLine } from "@/lib/game/alive";
import { aliveSleepy, aliveStore, useAlive } from "@/lib/game/alive-store";
import { speak, startMic } from "./alive-audio";

// "It's alive" (issue #86). After a Perch level passes, the effects of the level and of the levels before it show on the
// 3D board. Then the learner presses Continue, or waits, and Level complete opens. The 3D scene draws the light and the face;
// this panel starts the microphone and the voice, and shows the meter.

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function AliveStage() {
  // Leaving the page in the middle of the stage must not leave the effects for the next level.
  useEffect(() => {
    return () => aliveStore.getState().end();
  }, []);
  const stage = useAlive((s) => s.stage);
  return stage ? <Stage position={stage.position} /> : null;
}

function Stage({ position }: { position: number }) {
  const effects = useAlive((s) => s.effects);
  const mic = useAlive((s) => s.mic);
  const lastInput = useAlive((s) => s.lastInput);
  const bar = useRef<HTMLDivElement>(null);

  const done = () => {
    const { stage, end } = aliveStore.getState();
    end();
    stage?.onDone();
  };

  // The microphone starts when the learner taps the button, so the browser question comes from a clear action.
  const stopMic = useRef<(() => void) | null>(null);
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      stopMic.current?.();
    };
  }, []);
  const turnOnMic = async () => {
    const { set } = aliveStore.getState();
    const stop = await startMic((rms) => set({ volume: meterLevel(rms) }));
    if (!live.current) return stop?.();
    if (stop) {
      stopMic.current = stop;
      return set({ mic: "live" });
    }
    // The browser refused the microphone: an animated meter shows (PLAN.md cut fallback).
    set({ mic: "fallback", volume: 0.5 });
    if (reducedMotion()) return;
    let frame = requestAnimationFrame(function tick() {
      set({ volume: fallbackLevel(performance.now()) });
      frame = requestAnimationFrame(tick);
    });
    stopMic.current = () => cancelAnimationFrame(frame);
  };

  // The light, the voice and the face start once.
  useEffect(() => {
    const { set, fire } = aliveStore.getState();
    const still = reducedMotion();
    const stops: (() => void)[] = [];
    const list = effectsFor(position);

    if (list.includes("led")) {
      set({ ledOn: true });
      // With reduced motion, the light stays on and does not blink.
      if (!still) {
        const blink = setInterval(() => set({ ledOn: !aliveStore.getState().ledOn }), 500);
        stops.push(() => clearInterval(blink));
      }
    }

    if (list.includes("voice")) {
      const stop = speak(voiceLine, () => set({ speaking: true }), () => set({ speaking: false }));
      if (stop) stops.push(stop);
    }

    if (list.includes("face")) {
      const [pass, ...rest] = passTriggers(position);
      fire(pass, momentMs);
      // The last level: happy first, then the stars for a little time, then Perch is idle and the Talk button works.
      for (const trigger of rest) {
        const later = setTimeout(() => fire(trigger, momentMs * 2), momentMs);
        stops.push(() => clearTimeout(later));
      }
      const sleep = setInterval(() => set({ sleepy: aliveSleepy(aliveStore.getState(), Date.now()) }), 1000);
      stops.push(() => clearInterval(sleep));
    }

    return () => {
      stops.forEach((stop) => stop());
    };
  }, [position]);

  // The meter moves with the sound. It writes to the page directly, so the panel does not draw again at each frame.
  useEffect(() => {
    const draw = (volume: number) => bar.current?.style.setProperty("--level", String(volume));
    draw(aliveStore.getState().volume);
    return aliveStore.subscribe((s) => draw(s.volume));
  }, [mic]);

  // The learner has showMs of quiet, then Level complete opens. Each input starts the time again.
  useEffect(() => {
    const timer = setTimeout(done, showMs);
    return () => clearTimeout(timer);
  }, [lastInput]);

  // The hint of the level that passed. The hints of the earlier levels play too, but one line leaves the board in view.
  const hint = aliveText.hint[[...effects].at(-1)!];
  return (
    <div className="pointer-events-none absolute inset-0 z-30" onPointerDown={() => aliveStore.getState().input()}>
      {effects.has("mic") && (
        <div className="pointer-events-auto absolute inset-x-3 top-3 mx-auto max-w-sm rounded-xl border border-border bg-card px-3 py-2 shadow-panel">
          <p className="text-xs font-bold tracking-wide uppercase">{aliveText.meter.label}</p>
          <div ref={bar} className="mt-1 h-3 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <div className="h-full origin-left rounded-full bg-primary" style={{ transform: "scaleX(var(--level, 0))" }} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{mic === "live" ? aliveText.meter.live : mic === "fallback" ? aliveText.meter.fallback : aliveText.meter.off}</p>
          {mic === "off" && (
            <Button className="mt-2 h-9" onClick={() => void turnOnMic()}>
              {aliveText.meter.button}
            </Button>
          )}
        </div>
      )}
      <div className="pointer-events-auto absolute inset-x-3 bottom-4 flex flex-col items-center gap-2">
        <p className="max-w-sm rounded-xl bg-card px-3 py-2 text-center text-sm font-semibold shadow-panel" aria-live="polite">
          {hint}
        </p>
        <Button autoFocus onClick={done} className="h-12 px-8 text-base tracking-wide uppercase">
          {aliveText.continue}
        </Button>
      </div>
    </div>
  );
}
