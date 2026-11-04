// Chooses the voice that reads the steps aloud. Pure: no browser, no React. The browser default is often an old,
// robotic voice. Most browsers also have newer, more natural voices, but they are not the default.

/** The parts of a browser voice (SpeechSynthesisVoice) that the choice uses. */
export type VoiceInfo = { name: string; lang: string; localService: boolean; default: boolean };

// Words in the names of natural (neural) voices: Edge "Microsoft Aria Online (Natural)", Chrome "Google US English",
// Safari "Samantha (Enhanced)" or "(Premium)", and the newer Apple voices.
const NATURAL = /\b(natural|neural|online|enhanced|premium|google|siri)\b/i;
const GOOD_NAMES = /\b(samantha|ava|allison|susan|zoe|serena|daniel|karen|moira|tessa|aria|jenny|guy|sonia|libby)\b/i;
// The robotic voices: eSpeak on Linux, and the old desktop voices of Windows.
const ROBOTIC = /\b(espeak|desktop|compact|zira|david|mark|fred|albert|bad news|bells|bubbles|cellos|whisper|zarvox|trinoids|jester|organ|superstar|boing|wobble)\b/i;

/** A score for one voice: a higher score sounds more natural. English voices only; -Infinity for the others. */
export function voiceScore(v: VoiceInfo): number {
  if (!/^en\b/i.test(v.lang.replace("_", "-"))) return -Infinity;
  let score = 0;
  if (NATURAL.test(v.name)) score += 10;
  if (GOOD_NAMES.test(v.name)) score += 4;
  if (ROBOTIC.test(v.name)) score -= 20;
  if (/^en-(US|GB)$/i.test(v.lang.replace("_", "-"))) score += 2;
  if (v.default) score += 1;
  return score;
}

/** The most natural English voice in the list, or null when there is no English voice. */
export function pickVoice<V extends VoiceInfo>(voices: readonly V[]): V | null {
  let best: V | null = null;
  let bestScore = -Infinity;
  for (const v of voices) {
    const s = voiceScore(v);
    if (s > bestScore) {
      best = v;
      bestScore = s;
    }
  }
  return best;
}
