"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

// The dark screen of a tour: it makes all the page dark, except a hole on the control of the step.
// The hole is a box with a very large shadow. The box follows the control on each frame, so it stays on the control
// when the page scrolls, changes size or moves. It does not stop clicks. The tour card goes above it (z-[60]).

/** The space between the control and the edge of the hole, in pixels. */
const PAD = 6;

export function TourSpotlight({ target }: { target: () => HTMLElement | null }) {
  const hole = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let frame = 0;
    const place = () => {
      const control = target();
      const style = hole.current?.style;
      if (style) {
        if (control) {
          const { top, left, width, height } = control.getBoundingClientRect();
          Object.assign(style, {
            top: `${top - PAD}px`,
            left: `${left - PAD}px`,
            width: `${width + PAD * 2}px`,
            height: `${height + PAD * 2}px`,
          });
        }
        // With no control, the hole has no size: all the page is dark.
        else Object.assign(style, { width: "0px", height: "0px" });
      }
      frame = requestAnimationFrame(place);
    };
    place();
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return createPortal(
    <div
      ref={hole}
      aria-hidden="true"
      data-testid="tour-spotlight"
      className="pointer-events-none fixed z-50 rounded-xl shadow-[0_0_0_9999px_rgb(0_0_0/0.65)] ring-4 ring-probe"
    />,
    document.body,
  );
}
