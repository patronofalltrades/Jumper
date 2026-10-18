"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import type { CanvasTexture } from "three";

/**
 * A canvas texture, drawn again when the web fonts finish loading, so that the labels use IBM Plex Mono.
 * `key` draws it again when the thing it shows changes.
 */
export function useFontTexture(draw: () => CanvasTexture, key: unknown = null) {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const [texture, setTexture] = useState<CanvasTexture | null>(null);
  const drawRef = useRef(draw);
  useEffect(() => {
    drawRef.current = draw;
  });

  useEffect(() => {
    let current: CanvasTexture | null = null;
    let live = true;
    const paint = () => {
      if (!live) return;
      current?.dispose();
      current = drawRef.current();
      current.anisotropy = gl.capabilities.getMaxAnisotropy();
      current.colorSpace = "srgb";
      setTexture(current);
      invalidate();
    };
    paint();
    document.fonts.ready.then(paint);
    return () => {
      live = false;
      current?.dispose();
    };
  }, [gl, invalidate, key]);

  return texture;
}
