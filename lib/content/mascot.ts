import { projectMascot, type MascotId } from "@/lib/game/project-mascot";
import { loadProjects } from "./load";

/** The mascot of a project, from its content file (server only). Volt when the project names none. */
export function loadMascot(slug: string): MascotId {
  return projectMascot(loadProjects().find((p) => p.slug === slug)?.mascot);
}
