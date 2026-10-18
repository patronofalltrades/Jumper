import text from "@/content/ui/site.json";

// Jumper has a phone layout for upright phones only. A browser tab cannot lock the rotation (iPhone never lets a
// web page do it), so when a phone turns sideways this card covers the page until the phone is upright again.
// The page stays mounted below the card, so the board keeps its parts and its camera.
// CSS shows the card (globals.css, .turn-upright): a touch screen, sideways, and less than 500 px high.
export function TurnUpright() {
  return (
    <div className="turn-upright fixed inset-0 z-[100] hidden flex-col items-center justify-center gap-4 bg-background p-6 text-center" role="alert">
      <svg width="72" height="56" viewBox="0 0 36 28" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="6" y="3" width="12" height="22" rx="2.5" stroke="var(--pcb)" />
        <path d="M10.5 21h3" stroke="var(--pcb)" />
        <path d="M23 8a8 8 0 0 1 0 12" stroke="var(--probe)" />
        <path d="M23 20h3.5M23 20v-3.5" stroke="var(--probe)" />
      </svg>
      <p className="text-xl font-extrabold tracking-tight">{text.turnUpright.title}</p>
      <p className="max-w-xs text-muted-foreground">{text.turnUpright.body}</p>
    </div>
  );
}
