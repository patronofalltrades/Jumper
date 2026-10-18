import { cn } from "@/lib/utils";

// The Jumper mark: a jumper wire over two header pins. `onDark` is for the black band of the backdrop.
export function Logo({ onDark = false }: { onDark?: boolean }) {
  const pin = onDark ? "#ffffff" : "var(--ink)";
  return (
    <div className="flex items-center gap-2.5">
      <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
        <path d="M5 24 C5 6, 25 6, 25 24" fill="none" stroke="var(--pcb)" strokeWidth="3.2" strokeLinecap="round" />
        <rect x="2.5" y="22" width="5" height="6" rx="1" fill={pin} />
        <rect x="22.5" y="22" width="5" height="6" rx="1" fill={pin} />
      </svg>
      <span className={cn("text-2xl font-extrabold tracking-tight", onDark && "text-white")}>Jumper</span>
    </div>
  );
}
