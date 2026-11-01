// The mascot of each project (feature/mascots). Pure rules: no React, no file access.
// A project file names its mascot in `mascot`. A project that names none, or an unknown one, has Volt.

/** The mascots of Jumper. Volt is drawn in code (components/art/volt.tsx). The others are SVG files in public/mascots/. */
export const MASCOT_IDS = ["volt", "bulb", "coil", "knob"] as const;
export type MascotId = (typeof MASCOT_IDS)[number];

/** The mascot of a project, from the `mascot` field of its file. Volt when the field is missing or unknown. */
export function projectMascot(mascot: string | null | undefined): MascotId {
  return MASCOT_IDS.find((id) => id === mascot) ?? "volt";
}

/** The path, from the public folder, of the SVG file of one pose of a mascot drawn as a file. */
export const poseFile = (id: Exclude<MascotId, "volt">, pose: string) => `mascots/${id}-${pose}.svg`;
