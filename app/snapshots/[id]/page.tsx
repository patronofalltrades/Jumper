import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DeleteSnapshot, EditSnapshot, SnapshotBoard } from "@/components/snapshots/snapshot-page";
import { StarButton } from "@/components/snapshots/star-button";
import text from "@/content/ui/snapshots.json";
import { isStarred } from "@/lib/snapshots/stars";
import { countWiring, readWiring } from "@/lib/snapshots/wiring";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Snapshot · Jumper" };

const t = text.page;
const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k]));

// One snapshot: the board in 3D (view only), the star, the title and notes to edit, and Delete (TRD 4).
// Row-level security gives no row for a snapshot of another user, so that request shows "not found".
export default function SnapshotPage({ params }: PageProps<"/snapshots/[id]">) {
  return (
    <Suspense fallback={<p className="p-4 text-muted-foreground">Loading the snapshot…</p>}>
      {params.then(({ id }) => (
        <Snapshot id={id} />
      ))}
    </Suspense>
  );
}

async function Snapshot({ id }: { id: string }) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: snap, error } = await supabase
    .from("snapshots")
    .select("id, title, notes, wiring, passed, mistake_count, created_at, levels(position, title), stars(snapshot_id)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!snap) notFound();

  const level = snap.levels as unknown as { position: number; title: string };
  const parts = readWiring(snap.wiring);
  const date = new Date(snap.created_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

  return (
    <div className="fixed inset-0 flex flex-col bg-background max-lg:overflow-y-auto lg:flex-row">
      <section className="relative h-[55vh] shrink-0 lg:h-auto lg:flex-1">
        {parts ? <SnapshotBoard id={snap.id} parts={parts} /> : <p className="grid h-full place-items-center p-4 text-muted-foreground">{t.broken}</p>}
        <p className="pointer-events-none absolute inset-x-3 bottom-3 rounded-xl bg-card/90 px-3 py-2 text-xs text-muted-foreground shadow-panel">{t.view_only}</p>
      </section>

      <aside className="flex flex-col gap-4 border-border bg-card p-4 lg:w-[26rem] lg:overflow-y-auto lg:border-l lg:p-6">
        <div className="flex items-start justify-between gap-3">
          <Link
            href="/snapshots"
            className="inline-flex min-h-11 w-fit items-center rounded-xl border border-b-4 border-border bg-card px-3 text-sm font-semibold active:translate-y-0.5 active:border-b-2"
          >
            ← {t.back}
          </Link>
          <StarButton id={snap.id} starred={isStarred(snap.stars)} />
        </div>
        <div>
          <p className="font-mono text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            {fill(text.list.level, { level: level.position })} · {level.title} · {date}
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
            <span className={snap.passed ? "rounded-full bg-primary px-2 py-0.5 text-primary-foreground" : "rounded-full bg-muted px-2 py-0.5"}>
              {snap.passed ? text.list.passed : text.list.not_passed}
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5">{fill(text.list.mistakes, { n: snap.mistake_count })}</span>
            {parts && <span className="rounded-full bg-muted px-2 py-0.5">{fill(t.board, countWiring(parts))}</span>}
          </div>
        </div>
        <EditSnapshot id={snap.id} title={snap.title} notes={snap.notes} />
        <DeleteSnapshot id={snap.id} />
      </aside>
    </div>
  );
}
