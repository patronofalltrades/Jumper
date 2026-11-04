// The music of a level in build mode (content/music.json). Pure: no browser, no React.

export type Track = { level: number; file: string; title: string; artist: string; source_url: string; license: string };

/** The track of a level, or null when the project or the level has no music. */
export function levelTrack(music: Record<string, unknown>, project: string, level: number): Track | null {
  const tracks = music[project];
  if (!Array.isArray(tracks)) return null;
  return (tracks as Track[]).find((t) => t.level === level) ?? null;
}
