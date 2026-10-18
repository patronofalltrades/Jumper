// Flat drawings of the dev boards, used as the main picture on the catalog cards.
// The colors are the colors of the real boards, so they do not follow the theme.

const PIN = "#d9b45a";
const METAL = "#c9d1d6";

export function BoardArt({ board, className }: { board: string; className?: string }) {
  if (board === "Arduino Uno") return <Uno className={className} />;
  return <DevKit className={className} small={board === "ESP32-C3"} />;
}

function Shadow() {
  return <ellipse cx="80" cy="104" rx="62" ry="5" fill="#000" opacity="0.18" />;
}

function PinRow({ x, y, count, gap = 7 }: { x: number; y: number; count: number; gap?: number }) {
  return (
    <g fill={PIN}>
      {Array.from({ length: count }, (_, i) => (
        <rect key={i} x={x + i * gap} y={y} width="4" height="4" rx="0.8" />
      ))}
    </g>
  );
}

function Uno({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 110" className={className} aria-hidden="true">
      <Shadow />
      <rect x="14" y="14" width="132" height="84" rx="8" fill="#0f7f8a" />
      <rect x="14" y="14" width="132" height="84" rx="8" fill="none" stroke="#0a5d65" strokeWidth="2" />
      <rect x="6" y="26" width="24" height="20" rx="2" fill={METAL} />
      <rect x="8" y="64" width="18" height="16" rx="2" fill="#20262b" />
      <rect x="40" y="18" width="98" height="8" rx="1.5" fill="#20262b" />
      <PinRow x={43} y={20} count={14} />
      <rect x="62" y="86" width="76" height="8" rx="1.5" fill="#20262b" />
      <PinRow x={65} y={88} count={11} />
      <rect x="66" y="50" width="62" height="16" rx="2" fill="#20262b" />
      <g fill="#7d8a92">
        {Array.from({ length: 14 }, (_, i) => (
          <rect key={i} x={68 + i * 4.3} y="46" width="1.6" height="4" />
        ))}
      </g>
      <circle cx="46" cy="40" r="3" fill="#f2b705" />
      <text x="40" y="76" fontFamily="var(--font-plex-mono)" fontSize="8" fontWeight="600" fill="#e6f4f5">
        UNO
      </text>
    </svg>
  );
}

function DevKit({ className, small }: { className?: string; small?: boolean }) {
  const w = small ? 96 : 132;
  const x = 80 - w / 2;
  return (
    <svg viewBox="0 0 160 110" className={className} aria-hidden="true">
      <Shadow />
      <rect x={x} y="22" width={w} height="68" rx="6" fill="#1b2a33" />
      <PinRow x={x + 8} y={27} count={small ? 12 : 17} />
      <PinRow x={x + 8} y={81} count={small ? 12 : 17} />
      <rect x={x - 6} y="46" width="16" height="20" rx="2" fill={METAL} />
      <rect x={x + w - (small ? 44 : 56)} y="36" width={small ? 38 : 50} height="40" rx="2.5" fill={METAL} />
      <rect x={x + w - (small ? 40 : 52)} y="40" width={small ? 30 : 42} height="32" rx="1.5" fill="#dde3e7" />
      <path
        d={`M${x + w - 6} 38 v8 h-4 v6 h4 v6 h-4 v6 h4 v8`}
        fill="none"
        stroke={PIN}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx={x + 18} cy="56" r="2.6" fill="#34ae79" />
      <rect x={x + 26} y="50" width="12" height="12" rx="1.5" fill="#0d1418" />
    </svg>
  );
}
