// The surfaces of the night pages (Emerald Sun, issue #152): the landing page and the lobby.
// These pages sit on the night backdrop in both themes, so the colors are fixed: emerald and sun on near-black.

/** A frosted-glass panel, for the hero panels. */
export const GLASS =
  "rounded-[1.25rem] border border-white/10 bg-night-2/55 shadow-[0_24px_70px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl backdrop-saturate-[1.8]";

/** A solid dark panel, for the cards in a list. */
export const SOLID = "rounded-[1.25rem] border border-white/10 bg-night-2";

/** The emerald pill button, with a glow and the press-down feel. */
export const PRIMARY =
  "inline-flex min-h-13 items-center justify-center gap-3 rounded-full border-b-4 border-[#15a352] bg-[#22d66b] px-7 text-base font-semibold text-[#04140a] shadow-[0_0_40px_rgba(34,214,107,0.35)] transition-[transform,border] active:translate-y-0.5 active:border-b-2";

/** The dark outline pill button. */
export const OUTLINE =
  "inline-flex min-h-13 items-center justify-center rounded-full border border-white/15 bg-night px-7 text-base font-medium text-white hover:bg-white/5";
