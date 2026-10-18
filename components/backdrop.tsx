// Near-black in both themes, as in the reference.
const BLACK = "#0d1418";

// Large flat shapes behind the logged-in pages, as in the ToyCAD reference, in Jumper colors.
export function Backdrop() {
  return (
    <svg
      className="pointer-events-none fixed inset-0 -z-10 size-full"
      viewBox="0 0 1000 700"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <rect width="1000" height="700" fill="var(--bench)" />
      <polygon points="0,0 1000,0 1000,120 640,190 330,95 0,150" fill={BLACK} />
      <polygon points="0,150 330,95 260,330 0,420" fill="var(--pcb)" />
      <polygon points="330,95 640,190 520,360 260,330" fill="var(--probe)" />
      <polygon points="640,190 1000,120 1000,300 780,380" fill="var(--pcb-deep)" />
      <polygon points="640,190 780,380 520,360" fill="var(--pcb)" opacity="0.75" />
      <polygon points="0,420 260,330 300,700 0,700" fill="var(--probe)" opacity="0.55" />
      <polygon points="260,330 520,360 640,560 300,700" fill="var(--panel-2)" />
      <polygon points="520,360 780,380 1000,300 1000,560 640,560" fill="var(--probe)" opacity="0.8" />
      <polygon points="0,610 300,650 640,560 1000,560 1000,700 0,700" fill={BLACK} />
    </svg>
  );
}
