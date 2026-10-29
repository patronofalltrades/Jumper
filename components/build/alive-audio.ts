// The microphone and the voice of "It's alive" (issue #86). Web Audio and Speech Synthesis only.
// The sound stays in the browser: the app reads the loudness and throws the samples away. It does not record or save audio.

/**
 * Opens the microphone and calls `onLevel` at each frame with the loudness (RMS, 0 to 1). Gives a function that stops it,
 * or null when the browser refuses the microphone or has none.
 */
export async function startMic(onLevel: (rms: number) => void): Promise<(() => void) | null> {
  if (!navigator.mediaDevices?.getUserMedia) return null;
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    return null;
  }
  const ctx = new AudioContext();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  // The analyser is not joined to the speakers, so the learner does not hear the microphone.
  ctx.createMediaStreamSource(stream).connect(analyser);
  const samples = new Float32Array(analyser.fftSize);
  let frame = 0;
  const tick = () => {
    analyser.getFloatTimeDomainData(samples);
    onLevel(Math.sqrt(samples.reduce((sum, v) => sum + v * v, 0) / samples.length));
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(frame);
    stream.getTracks().forEach((t) => t.stop());
    void ctx.close();
  };
}

/** The browser says the line. Gives a function that stops it, or null when the browser has no voice. */
export function speak(line: string, onStart: () => void, onEnd: () => void): (() => void) | null {
  if (typeof speechSynthesis === "undefined" || typeof SpeechSynthesisUtterance === "undefined") return null;
  const utterance = new SpeechSynthesisUtterance(line);
  utterance.onstart = onStart;
  utterance.onend = onEnd;
  utterance.onerror = onEnd;
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
  return () => {
    utterance.onend = null;
    utterance.onerror = null;
    speechSynthesis.cancel();
  };
}
