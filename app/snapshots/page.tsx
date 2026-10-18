import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Backdrop } from "@/components/backdrop";
import { Dock } from "@/components/dock";
import text from "@/content/ui/snapshots.json";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Lab notebook · Jumper" };

const t = text.list;
const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k]));

// The lab notebook: the user's snapshots, newest first (TRD 4). Search, filters and sort come with feature 9.
export default function SnapshotsPage() {
  return (
    <>
      <Backdrop />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-8">
        <header>
          <h1 className="text-4xl leading-none font-extrabold tracking-tight text-white">{t.heading}</h1>
          <p className="mt-2 text-white/70">{t.text}</p>
        </header>
        <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
          <List />
        </Suspense>
      </main>
      <Dock active="builds" />
    </>
  );
}

async function List() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("snapshots")
    .select("id, title, notes, passed, mistake_count, created_at, levels(position, title)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!data.length) return <p className="rounded-2xl bg-card p-5 text-muted-foreground shadow-panel">{t.empty}</p>;

  return (
    <ul className="flex flex-col gap-3">
      {data.map((snap) => {
        const level = snap.levels as unknown as { position: number; title: string };
        const date = new Date(snap.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
        return (
          <li key={snap.id}>
            <Link
              href={`/snapshots/${snap.id}`}
              className="flex flex-col gap-1 rounded-2xl border-b-4 border-border bg-card p-4 shadow-panel transition-[transform,border] active:translate-y-0.5 active:border-b-2"
            >
              <span className="font-mono text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                {fill(t.level, { level: level.position })} · {level.title} · {date}
              </span>
              <span className="text-xl font-extrabold tracking-tight">{snap.title}</span>
              {snap.notes && <span className="line-clamp-2 text-sm text-muted-foreground">{snap.notes}</span>}
              <span className="mt-1 flex gap-2 text-xs font-semibold">
                <span className={snap.passed ? "rounded-full bg-primary px-2 py-0.5 text-primary-foreground" : "rounded-full bg-muted px-2 py-0.5"}>
                  {snap.passed ? t.passed : t.not_passed}
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5">{fill(t.mistakes, { n: snap.mistake_count })}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
