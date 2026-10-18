"use client";

import { useEffect } from "react";
import { boardStore, useBoard } from "@/lib/game/board-store";

// A correct part snaps in: a short click. A wrong part buzzes: a low tone and, on a phone, a vibration.
// The sounds are made with Web Audio, so the app has no sound files.

let audio: AudioContext | null = null;

function tone(type: OscillatorType, from: number, to: number, start: number, length: number, volume: number) {
  const ctx = audio!;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, ctx.currentTime + start);
  osc.frequency.exponentialRampToValueAtTime(to, ctx.currentTime + start + length);
  gain.gain.setValueAtTime(volume, ctx.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + length);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + length);
}

function play(kind: "snap" | "buzz") {
  try {
    audio ??= new AudioContext();
    void audio.resume();
    if (kind === "snap") {
      tone("triangle", 1800, 1200, 0, 0.05, 0.25);
      tone("triangle", 2600, 1900, 0.06, 0.07, 0.2);
    } else {
      tone("sawtooth", 140, 90, 0, 0.32, 0.18);
    }
  } catch {
    // No Web Audio: the flash on the board still shows the result.
  }
  if (kind === "buzz") navigator.vibrate?.([70, 50, 70]);
}

/** Plays the snap or the buzz, and clears the flash on the board after a short time. */
export function useFeedback() {
  const flash = useBoard((s) => s.flash);
  useEffect(() => {
    if (!flash) return;
    play(flash.kind);
    const timer = setTimeout(() => boardStore.setState({ flash: null }), 700);
    return () => clearTimeout(timer);
  }, [flash]);
}
