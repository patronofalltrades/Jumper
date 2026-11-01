"use client";

import { useEffect, useRef } from "react";

// A hidden marker in the level to play now. When the map opens, the row that holds it scrolls into view.
export function ScrollHere() {
  const marker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    marker.current?.parentElement?.scrollIntoView({ block: "center" });
  }, []);
  return <span ref={marker} hidden />;
}
