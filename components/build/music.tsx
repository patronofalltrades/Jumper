"use client";

import { useEffect, useRef } from "react";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import text from "@/content/ui/build.json";
import type { Track } from "@/lib/game/music";
import { cn } from "@/lib/utils";

// The music of the level while the learner wires (content/music.json). One <audio> element, as a loop at a low volume.
// The choice "Play music" is kept in the browser (localStorage), and it is on at the start. Browsers do not play sound
// before the first click or key, so the music waits for it. The music stops when the tab is hidden.

const KEY = "jumper.music";
const VOLUME = 0.3;
const t = text.music;

const choice = createStore<{ on: boolean }>(() => ({ on: true }));

function useMusicChoice(): [boolean, (on: boolean) => void] {
  const on = useStore(choice, (s) => s.on);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved !== null) choice.setState({ on: saved === "on" });
    } catch {
      // A private window can refuse the storage: the music stays on.
    }
  }, []);
  const set = (value: boolean) => {
    try {
      localStorage.setItem(KEY, value ? "on" : "off");
    } catch {
      // The choice still holds for this page.
    }
    choice.setState({ on: value });
  };
  return [on, set];
}

/** Plays the track as a loop while `play` is true and the learner has the music on. */
export function useLevelMusic(track: Track | null, play: boolean) {
  const [on] = useMusicChoice();
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!track) return;
    const el = new Audio(track.file);
    el.loop = true;
    el.volume = VOLUME;
    el.preload = "none";
    audio.current = el;
    return () => {
      el.pause();
      el.removeAttribute("src");
      el.load();
      audio.current = null;
    };
  }, [track]);

  useEffect(() => {
    const el = audio.current;
    if (!el) return;
    const wanted = () => play && on && !document.hidden;
    const sync = () => {
      if (wanted()) el.play().catch(() => {});
      else el.pause();
    };
    // Before the first click or key, play() fails. Each gesture tries again, until the music plays.
    const retry = () => {
      if (wanted() && el.paused) sync();
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("pointerdown", retry);
    window.addEventListener("keydown", retry);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("pointerdown", retry);
      window.removeEventListener("keydown", retry);
    };
  }, [play, on, track]);
}

/** The switch "Play music", with the name of the track and its source. */
export function MusicSwitch({ track }: { track: Track | null }) {
  const [on, setOn] = useMusicChoice();
  if (!track) return null;
  return (
    <div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => setOn(!on)}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-2 text-left text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span>{t.switch}</span>
        <span aria-hidden="true" className={cn("relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 transition-colors", on ? "border-primary bg-primary" : "border-border bg-muted")}>
          <span className={cn("absolute top-0.5 size-4 rounded-full bg-card shadow transition-transform", on ? "translate-x-5" : "translate-x-0.5")} />
        </span>
      </button>
      <p className="px-2 pb-1 text-xs text-muted-foreground">
        <a href={track.source_url} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
          {t.credit.replace("{title}", track.title).replace("{artist}", track.artist).replace("{license}", track.license)}
        </a>
      </p>
    </div>
  );
}
