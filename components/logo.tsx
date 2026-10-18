// The Jumper mark: a jumper wire over two header pins.
export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
        <path d="M5 24 C5 6, 25 6, 25 24" fill="none" stroke="var(--pcb)" strokeWidth="3.2" strokeLinecap="round" />
        <rect x="2.5" y="22" width="5" height="6" rx="1" fill="var(--ink)" />
        <rect x="22.5" y="22" width="5" height="6" rx="1" fill="var(--ink)" />
      </svg>
      <span className="text-2xl font-extrabold tracking-tight">Jumper</span>
    </div>
  );
}
