"use client";

import { useState } from "react";
import { browserStorage } from "@/components/build/tour";
import { Button } from "@/components/ui/button";
import text from "@/content/ui/profile.json";
import { resetTour } from "@/lib/game/tour";

// "Show the tour again" (issue #123): clears the flag of the first-visit tour in this browser.
export function TourAgain() {
  const [done, setDone] = useState(false);
  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-panel">
      <div>
        <h2 className="text-lg font-extrabold tracking-tight">{text.tour.heading}</h2>
        <p className="text-sm text-muted-foreground">{text.tour.text}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={() => {
            resetTour(browserStorage());
            setDone(true);
          }}
        >
          {text.tour.button}
        </Button>
        {done && (
          <p role="status" className="text-sm font-semibold">
            {text.tour.done}
          </p>
        )}
      </div>
    </section>
  );
}
