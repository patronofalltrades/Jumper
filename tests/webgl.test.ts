import { describe, expect, it } from "vitest";
import { hasWebGL } from "@/lib/device";

// A browser without WebGL must not stop the page: the 3D board shows a note in its place.
const canvas = (contexts: Record<string, object | null>) => ({ getContext: (kind: string) => contexts[kind] ?? null });

describe("hasWebGL", () => {
  it("is true when the browser can make a WebGL 2 or a WebGL context", () => {
    expect(hasWebGL(canvas({ webgl2: {} }))).toBe(true);
    expect(hasWebGL(canvas({ webgl: {} }))).toBe(true);
  });

  it("is false when the browser has no WebGL", () => {
    expect(hasWebGL(canvas({}))).toBe(false);
  });

  it("is false when the browser refuses to make the context", () => {
    expect(hasWebGL({ getContext: () => { throw new Error("blocked"); } })).toBe(false);
  });

  it("gives the test context back, so that it does not use one of the few contexts of the page", () => {
    let lost = false;
    const gl = { getExtension: () => ({ loseContext: () => (lost = true) }) };
    hasWebGL(canvas({ webgl2: gl }));
    expect(lost).toBe(true);
  });
});
