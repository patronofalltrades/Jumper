// Perch with its happy face on the screen, as the 3D board shows it after a level passes (issue #86). The face shapes
// and colors are the ones of components/scene/face.ts (the approved design): amber eyes and mouth on a dark screen.
// Used on the landing page (issue #152). The colors are the colors of the device, so they do not follow the theme.
const AMBER = "#F2B705";

export function PerchFace({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 330" className={className} aria-hidden="true">
      <ellipse cx="150" cy="316" rx="104" ry="10" fill="#000" opacity="0.22" />
      <path d="M108 270 L96 306 H204 L192 270 Z" fill="#26343d" />
      <rect x="20" y="10" width="260" height="270" rx="48" fill="#13202a" />
      <rect x="20" y="10" width="260" height="270" rx="48" fill="none" stroke="#2c3c46" strokeWidth="4" />
      <svg x="38" y="28" width="224" height="200" viewBox="0 8 240 214">
        <rect x="0" y="8" width="240" height="214" rx="26" fill="#0E1114" />
        <rect x="62" y="80" width="38" height="56" rx="19" fill={AMBER} />
        <rect x="140" y="80" width="38" height="56" rx="19" fill={AMBER} />
        <path d="M92 158 Q120 192 148 158 Z" fill={AMBER} />
        <circle cx="52" cy="150" r="9" fill="#E26A5B" opacity="0.55" />
        <circle cx="188" cy="150" r="9" fill="#E26A5B" opacity="0.55" />
      </svg>
      <circle cx="232" cy="254" r="12" fill="#e3a008" />
      <circle cx="200" cy="254" r="5" fill="#34ae79" />
      <g fill="#3a4b55">
        <circle cx="68" cy="254" r="3" />
        <circle cx="82" cy="254" r="3" />
        <circle cx="96" cy="254" r="3" />
      </g>
    </svg>
  );
}
