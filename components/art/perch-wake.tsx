// The Perch device wakes up: the screen lights, the eyes open, the smile and the status light come on.
// The same drawing as PerchArt. The animation is in app/globals.css (.perch-wake).
export function PerchWake({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 220" className={`perch-wake ${className ?? ""}`} aria-hidden="true">
      <ellipse cx="110" cy="204" rx="78" ry="9" fill="#000" opacity="0.16" />
      <path d="M78 176 L70 200 H150 L142 176 Z" fill="#26343d" />
      <g className="perch-wake-body">
        <rect x="28" y="22" width="164" height="160" rx="34" fill="#13202a" />
        <rect x="28" y="22" width="164" height="160" rx="34" fill="none" stroke="#2c3c46" strokeWidth="3" />
        {/* screen: dark, then it lights */}
        <rect x="48" y="42" width="124" height="96" rx="18" fill="#0a1216" />
        <rect className="perch-wake-glow" x="48" y="42" width="124" height="96" rx="18" fill="#34ae79" />
        <rect className="perch-wake-eye" x="76" y="70" width="18" height="26" rx="9" fill="#34ae79" />
        <rect className="perch-wake-eye" x="126" y="70" width="18" height="26" rx="9" fill="#34ae79" />
        <path className="perch-wake-smile" d="M90 110 Q110 126 130 110" fill="none" stroke="#34ae79" strokeWidth="6" strokeLinecap="round" pathLength={1} />
        <ellipse className="perch-wake-cheek" cx="70" cy="110" rx="8" ry="4" fill="#f2b705" />
        <ellipse className="perch-wake-cheek" cx="150" cy="110" rx="8" ry="4" fill="#f2b705" />
        <circle cx="160" cy="158" r="9" fill="#e3a008" />
        <circle cx="160" cy="158" r="9" fill="none" stroke="#b77f00" strokeWidth="2" />
        <circle className="perch-wake-led" cx="136" cy="158" r="3.5" fill="#34ae79" />
        <g fill="#3a4b55">
          <circle cx="60" cy="158" r="2.2" />
          <circle cx="70" cy="158" r="2.2" />
          <circle cx="80" cy="158" r="2.2" />
        </g>
      </g>
    </svg>
  );
}
