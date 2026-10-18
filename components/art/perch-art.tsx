// The Perch desk device with its face on the screen: the main picture on the Continue card.
export function PerchArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 220" className={className} aria-hidden="true">
      <ellipse cx="110" cy="204" rx="78" ry="9" fill="#000" opacity="0.16" />
      {/* stand */}
      <path d="M78 176 L70 200 H150 L142 176 Z" fill="#26343d" />
      {/* body */}
      <rect x="28" y="22" width="164" height="160" rx="34" fill="#13202a" />
      <rect x="28" y="22" width="164" height="160" rx="34" fill="none" stroke="#2c3c46" strokeWidth="3" />
      {/* screen */}
      <rect x="48" y="42" width="124" height="96" rx="18" fill="#0a1216" />
      <rect x="48" y="42" width="124" height="96" rx="18" fill="#34ae79" opacity="0.08" />
      <rect x="76" y="70" width="18" height="26" rx="9" fill="#34ae79" />
      <rect x="126" y="70" width="18" height="26" rx="9" fill="#34ae79" />
      <path d="M90 110 Q110 126 130 110" fill="none" stroke="#34ae79" strokeWidth="6" strokeLinecap="round" />
      <ellipse cx="70" cy="110" rx="8" ry="4" fill="#f2b705" opacity="0.35" />
      <ellipse cx="150" cy="110" rx="8" ry="4" fill="#f2b705" opacity="0.35" />
      {/* talk button, status light and mic holes */}
      <circle cx="160" cy="158" r="9" fill="#e3a008" />
      <circle cx="160" cy="158" r="9" fill="none" stroke="#b77f00" strokeWidth="2" />
      <circle cx="136" cy="158" r="3.5" fill="#34ae79" />
      <g fill="#3a4b55">
        <circle cx="60" cy="158" r="2.2" />
        <circle cx="70" cy="158" r="2.2" />
        <circle cx="80" cy="158" r="2.2" />
      </g>
    </svg>
  );
}
