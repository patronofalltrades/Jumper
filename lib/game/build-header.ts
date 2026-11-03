import { fill } from "@/lib/sketch/parse";

/**
 * The line above the build page title and in the level intro pop-up, e.g. "Perch · ESP32-S3 · Level 2".
 * `template`: content/ui/build.json, header.eyebrow. The project name is the part of the title before the colon.
 */
export function buildEyebrow(template: string, project: { title: string; board: string }, position: number): string {
  return fill(template, { project: project.title.split(":")[0], board: project.board, n: position });
}
