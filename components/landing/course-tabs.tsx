"use client";

import Link from "next/link";
import { useState } from "react";
import text from "@/content/ui/landing.json";
import { cn } from "@/lib/utils";

// The project tabs of the landing page (issue #152), after the topic tabs of brilliant.org. An available project lists
// its real levels; a Coming soon project lists what it teaches.

export type CourseTab = { slug: string; name: string; title: string; board: string; tagline: string; available: boolean; items: string[] };

const c = text.courses;

export function CourseTabs({ courses }: { courses: CourseTab[] }) {
  const [index, setIndex] = useState(0);
  const course = courses[index];
  if (!course) return null;

  return (
    <div className="flex flex-col gap-6">
      <div role="tablist" aria-label={text.nav.projects} className="flex flex-wrap gap-2">
        {courses.map((tab, i) => (
          <button
            key={tab.slug}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-controls="course-panel"
            onClick={() => setIndex(i)}
            className={cn(
              "min-h-11 rounded-full border px-5 text-[15px] font-semibold transition-colors",
              i === index ? "border-white bg-white text-on-emerald" : "border-white/15 text-white/80 hover:text-white",
            )}
          >
            {tab.name}
          </button>
        ))}
      </div>
      <div id="course-panel" role="tabpanel" className="grid gap-8 rounded-[1.25rem] border border-white/10 bg-night-2 p-6 sm:p-8 md:grid-cols-2">
        <div className="flex flex-col gap-2.5">
          <span className="font-mono text-xs font-semibold tracking-wider text-white/55 uppercase">
            {course.board}
            {course.available && ` · ${c.levels.replace("{count}", String(course.items.length))}`}
          </span>
          <h3 className="text-3xl leading-tight font-bold">{course.title}</h3>
          <p className="text-white/65">{course.tagline}</p>
          {course.available ? (
            <Link
              href={`/start?build=${course.slug}`}
              className="mt-2 inline-flex min-h-12 w-fit items-center gap-2.5 rounded-full border-b-4 border-emerald-deep bg-emerald px-6 font-semibold text-on-emerald active:translate-y-0.5 active:border-b-2"
            >
              {c.play.replace("{name}", course.name)}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          ) : (
            <span className="mt-2 w-fit rounded-full border border-dashed border-white/25 px-4 py-1.5 text-sm font-semibold text-white/80">{c.soon}</span>
          )}
        </div>
        <ol className="flex flex-col gap-2.5">
          {course.items.map((item, i) => (
            <li key={item} className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] py-2 pr-4 pl-2">
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-[10px] text-sm font-bold",
                  course.available ? "bg-emerald text-on-emerald" : "bg-white/10 text-white/60",
                )}
                aria-hidden="true"
              >
                {course.available ? i + 1 : "·"}
              </span>
              <span className="text-[15px] font-medium">{item}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
