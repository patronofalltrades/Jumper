import { describe, expect, it } from "vitest";
import { pickVoice, type VoiceInfo } from "@/lib/game/voice";

// The read-aloud voice: the app chooses the most natural English voice, not the robotic browser default.

const v = (name: string, lang = "en-US", isDefault = false): VoiceInfo => ({ name, lang, localService: true, default: isDefault });

describe("pickVoice", () => {
  it("chooses a natural voice over the robotic default", () => {
    const voices = [v("Microsoft David - English (United States)", "en-US", true), v("Microsoft Aria Online (Natural) - English (United States)")];
    expect(pickVoice(voices)?.name).toContain("Aria");
  });

  it("chooses Google US English over eSpeak", () => {
    expect(pickVoice([v("eSpeak English", "en", true), v("Google US English")])?.name).toBe("Google US English");
  });

  it("chooses an enhanced Safari voice over a novelty voice", () => {
    expect(pickVoice([v("Zarvox"), v("Samantha (Enhanced)")])?.name).toBe("Samantha (Enhanced)");
  });

  it("does not choose a voice in another language", () => {
    expect(pickVoice([v("Google Deutsch", "de-DE")])).toBeNull();
  });

  it("gives null for an empty list", () => {
    expect(pickVoice([])).toBeNull();
  });
});
