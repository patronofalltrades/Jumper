import text from "@/content/ui/mascot.json";
import type { Pose } from "@/lib/game/mascot";
import { cn } from "@/lib/utils";

// Volt, the Jumper mascot: the box robot of public/avatars/volt.svg, standing, with no background.
// Each pose changes the eyes, the mouth and the arms. The motion (hop or shake) is in app/globals.css (.volt-*).
// With `label`, a screen reader reads the pose text from content/ui/mascot.json; without it, Volt is decoration.

const OUTLINE = { stroke: "#13202a", strokeWidth: 6, strokeLinecap: "round", strokeLinejoin: "round" } as const;

// Shoulder → hand, left and right.
const ARMS: Record<Pose, [string, string]> = {
  idle: ["M82 214 L62 242", "M174 214 L194 242"],
  happy: ["M82 214 L62 242", "M174 214 L206 184"],
  oops: ["M82 214 L62 242", "M174 214 L194 242"],
  cheer: ["M82 214 L48 182", "M174 214 L208 182"],
};

export function Volt({ pose, label = false, className }: { pose: Pose; label?: boolean; className?: string }) {
  const happyEyes = pose === "happy" || pose === "cheer";
  return (
    <svg
      viewBox="24 10 208 256"
      className={cn("volt", `volt-${pose}`, className)}
      {...(label ? { role: "img", "aria-label": text.poses[pose] } : { "aria-hidden": true })}
    >
      <ellipse cx="128" cy="259" rx="54" ry="6" fill="#000" opacity="0.16" />
      <g className="volt-body">
        {ARMS[pose].map((d) => {
          const [x, y] = d.split(" L")[1].split(" ").map(Number);
          return (
            <g key={d}>
              <path d={d} fill="none" {...OUTLINE} />
              <circle cx={x} cy={y} r="8" fill="#9fb0ba" {...OUTLINE} />
            </g>
          );
        })}
        <rect x="78" y="200" width="100" height="56" rx="16" fill="#c9d4da" {...OUTLINE} />
        <rect x="96" y="216" width="14" height="14" rx="3" fill="#e3a008" />
        <rect x="118" y="216" width="14" height="14" rx="3" fill="#c9412f" />
        <rect x="140" y="216" width="22" height="14" rx="3" fill="#566874" />
        <rect x="112" y="184" width="32" height="20" fill="#9fb0ba" {...OUTLINE} />
        <line x1="128" y1="72" x2="128" y2="42" {...OUTLINE} />
        <circle cx="128" cy="34" r="11" fill={pose === "oops" ? "#c9412f" : "#e3a008"} {...OUTLINE} />
        <circle cx="52" cy="128" r="9" fill="#9fb0ba" {...OUTLINE} />
        <circle cx="204" cy="128" r="9" fill="#9fb0ba" {...OUTLINE} />
        <rect x="56" y="70" width="144" height="120" rx="24" fill="#e6edf1" {...OUTLINE} />

        {happyEyes ? (
          <>
            <path d="M86 122 Q100 102 114 122" fill="none" {...OUTLINE} />
            <path d="M142 122 Q156 102 170 122" fill="none" {...OUTLINE} />
          </>
        ) : (
          <>
            <ellipse cx="100" cy="116" rx="15" ry="19" fill="#fff" {...OUTLINE} />
            <ellipse cx="156" cy="116" rx="15" ry="19" fill="#fff" {...OUTLINE} />
            {pose === "oops" ? (
              <>
                <circle cx="96" cy="122" r="5" fill="#13202a" />
                <circle cx="152" cy="122" r="5" fill="#13202a" />
              </>
            ) : (
              <>
                <ellipse cx="103" cy="119" rx="7" ry="9" fill="#13202a" />
                <ellipse cx="153" cy="119" rx="7" ry="9" fill="#13202a" />
              </>
            )}
          </>
        )}

        {pose === "idle" && <path d="M104 152 Q128 172 152 152" fill="none" {...OUTLINE} />}
        {pose === "happy" && (
          <>
            <path d="M94 146 Q128 186 162 146 Z" fill="#13202a" {...OUTLINE} />
            <path d="M112 162 Q128 172 144 162 Q128 156 112 162 Z" fill="#c9412f" />
          </>
        )}
        {pose === "cheer" && (
          <>
            <path d="M90 142 Q128 196 166 142 Z" fill="#13202a" {...OUTLINE} />
            <path d="M108 164 Q128 178 148 164 Q128 156 108 164 Z" fill="#c9412f" />
          </>
        )}
        {pose === "oops" && (
          <>
            <path d="M104 160 q8 -8 16 0 t16 0 t16 0" fill="none" {...OUTLINE} />
            <path d="M184 78 q8 12 0 16 q-8 -4 0 -16 Z" fill="#7cc4e8" stroke="#13202a" strokeWidth="3" strokeLinejoin="round" />
          </>
        )}
      </g>
    </svg>
  );
}
