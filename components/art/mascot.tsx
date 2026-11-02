"use client";

import Image from "next/image";
import { createContext } from "react";
import { Volt } from "@/components/art/volt";
import text from "@/content/ui/mascot.json";
import type { Pose } from "@/lib/game/mascot";
import { poseFile, type MascotId } from "@/lib/game/project-mascot";
import { cn } from "@/lib/utils";

// The mascot of each project (feature/mascots). Volt is drawn in code (components/art/volt.tsx). The other mascots
// are the SVG files of their poses in public/mascots/. Their motion is the same as Volt's (app/globals.css, .mascot-*).

/** The mascot of the project on screen. Build mode sets it, so the tour and the pop-ups show the mascot of the project. */
export const MascotContext = createContext<MascotId>("volt");

/** A mascot in one pose. `label`: a screen reader reads the pose text. */
export function Mascot({ id, pose, label = false, className }: { id: MascotId; pose: Pose; label?: boolean; className?: string }) {
  if (id === "volt") return <Volt pose={pose} label={label} className={className} />;
  const name = text.mascots[id].poses[pose];
  return (
    <Image
      src={`/${poseFile(id, pose)}`}
      alt={label ? name : ""}
      aria-hidden={label ? undefined : true}
      width={256}
      height={256}
      unoptimized
      className={cn("mascot", `mascot-${pose}`, className)}
    />
  );
}
