import text from "@/content/ui/walkthrough.json";
import { createBench, perchBench } from "@/lib/circuit/bench";
import { introClip, levelClip, type Clip, type IntroScript } from "@/lib/game/walkthrough";
import { loadBenchSpec } from "./benches";
import { loadBoards } from "./boards";
import { loadProjects } from "./load";
import { introVideo, levelVideo } from "./videos";

// The walkthrough clips (issue #48) come from content/projects/ and content/boards/, not the database, so the
// landing page can show the intro clip to a visitor who is not logged in.

/**
 * The clip of each level of a project, by level position. A level has a clip when it has a board and a recorded
 * video in content/videos.json. The Arduino Foundations levels have no video yet, so they have no clip (issue #57).
 */
export async function loadLevelClips(slug: string): Promise<Map<number, Clip>> {
  const project = loadProjects().find((p) => p.slug === slug);
  const boards = await loadBoards(slug);
  const bench = createBench(await loadBenchSpec(slug));
  const clips = new Map<number, Clip>();
  for (const level of project?.levels ?? []) {
    const video = levelVideo(slug, level.position);
    if (!boards.levels[level.position] || !video) continue;
    const clip = levelClip(bench, boards, level, text.end.replace("{n}", String(level.position)));
    clips.set(level.position, { ...clip, video: video.id });
  }
  return clips;
}

/** The intro clip of the landing page: the game loop, on a few steps of one Perch level. */
export async function loadIntroClip(): Promise<Clip | null> {
  const script = text.intro as IntroScript;
  const level = loadProjects()
    .find((p) => p.slug === "perch")
    ?.levels.find((l) => l.position === script.level);
  return level ? { ...introClip(perchBench(), await loadBoards("perch"), level, script), video: introVideo()?.id } : null;
}
