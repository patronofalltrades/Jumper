import text from "@/content/ui/walkthrough.json";
import { perchBench } from "@/lib/circuit/bench";
import { introClip, levelClip, type Clip, type IntroScript } from "@/lib/game/walkthrough";
import { loadBoards } from "./boards";
import { loadProjects } from "./load";

// The walkthrough clips (issue #48) come from content/projects/ and content/boards/, not the database, so the
// landing page can show the intro clip to a visitor who is not logged in.

/** The clip of each level of a project, by level position. A project without levels or boards has no clips. */
export async function loadLevelClips(slug: string): Promise<Map<number, Clip>> {
  const project = loadProjects().find((p) => p.slug === slug);
  const boards = await loadBoards(slug);
  const clips = new Map<number, Clip>();
  for (const level of project?.levels ?? []) {
    if (!boards.levels[level.position]) continue;
    clips.set(level.position, levelClip(perchBench(), boards, level, text.end.replace("{n}", String(level.position))));
  }
  return clips;
}

/** The intro clip of the landing page: the game loop, on a few steps of one Perch level. */
export async function loadIntroClip(): Promise<Clip | null> {
  const script = text.intro as IntroScript;
  const level = loadProjects()
    .find((p) => p.slug === "perch")
    ?.levels.find((l) => l.position === script.level);
  return level ? introClip(perchBench(), await loadBoards("perch"), level, script) : null;
}
