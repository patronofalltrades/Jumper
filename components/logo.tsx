import Link from "next/link";
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

// The logo of the glass nav (Emerald Sun, issue #152): an emerald bolt and the lowercase name. Phone: the bolt only.
export function GlassLogo({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="flex min-h-11 items-center gap-2 pr-2 pl-1 sm:pr-3" aria-label={label}>
      <span className="flex size-8 items-center justify-center rounded-full bg-[#22d66b]">
        <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" fill="#04140a" />
        </svg>
      </span>
      <span className="hidden text-xl font-bold tracking-tight min-[400px]:inline">jumper</span>
    </Link>
  );
}
