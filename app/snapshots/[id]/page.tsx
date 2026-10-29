import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LeaveButton, Notes, type Note } from "@/components/collaborate/notes";
import { DeleteSnapshot, EditSnapshot, SnapshotBoard } from "@/components/snapshots/snapshot-page";
import { ShareSheet } from "@/components/snapshots/share-sheet";
import { StarButton } from "@/components/snapshots/star-button";
import collab from "@/content/ui/collaborate.json";
import text from "@/content/ui/snapshots.json";
import { loadBenchSpec } from "@/lib/content/benches";
import { isStarred } from "@/lib/snapshots/stars";
import { countWiring, readWiring } from "@/lib/snapshots/wiring";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Snapshot · Jumper" };

const t = text.page;
const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k]));

// One snapshot: the board in 3D (view only), the star, the title and notes to edit, and Delete (TRD 4).
// Row-level security gives no row for a snapshot of another user, except a joined collaborator (issue #88), so that request shows "not found".
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
  const { data: auth } = await supabase.auth.getClaims();
  const sub = auth?.claims.sub;
  const { data: snap, error } = await supabase
    .from("snapshots")
    .select("id, user_id, title, notes, wiring, shared, passed, mistake_count, created_at, levels(position, title, projects(slug)), stars(snapshot_id)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!snap) notFound();

  // A joined collaborator also gets this row (issue #88). The page is view only for them: no star, no edit, no delete.
  const mine = snap.user_id === sub;
  const level = snap.levels as unknown as { position: number; title: string; projects: { slug: string } | null };
  const [notes, owner, collaboration] = await Promise.all([
    supabase.from("snapshot_notes").select("id, body, created_at, user_id, profiles!user_id(display_name)").eq("snapshot_id", snap.id).order("created_at"),
    mine ? null : supabase.from("profiles").select("display_name").eq("id", snap.user_id).maybeSingle(),
    mine ? null : supabase.from("collaborators").select("id").eq("collaborator_id", sub ?? "").eq("owner_id", snap.user_id).maybeSingle(),
  ]);
  if (notes.error) throw notes.error;
  const noteList: Note[] = notes.data.map((n) => ({
    id: n.id,
    body: n.body,
    created_at: n.created_at,
    mine: n.user_id === sub,
    author: (n.profiles as unknown as { display_name: string | null } | null)?.display_name || collab.notes.former,
  }));
  const ownerName = owner?.data?.display_name || collab.lobby.someone;
  // The board goes on the bench of its project: the Uno bench for Arduino Foundations.
  const bench = await loadBenchSpec(level.projects?.slug ?? "perch");
  const parts = readWiring(snap.wiring);
  const date = new Date(snap.created_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

  return (
    <div className="fixed inset-0 flex flex-col bg-background max-lg:overflow-y-auto lg:flex-row">
      <section className="relative h-[55vh] shrink-0 lg:h-auto lg:flex-1">
        {parts ? <SnapshotBoard id={snap.id} parts={parts} bench={bench} /> : <p className="grid h-full place-items-center p-4 text-muted-foreground">{t.broken}</p>}
        <p className="pointer-events-none absolute inset-x-3 bottom-3 rounded-xl bg-card/90 px-3 py-2 text-xs text-muted-foreground shadow-panel">{t.view_only}</p>
      </section>

      <aside className="flex flex-col gap-4 border-border bg-card p-4 lg:w-[26rem] lg:overflow-y-auto lg:border-l lg:p-6">
        <div className="flex items-start justify-between gap-3">
          <Link
            href={mine ? "/snapshots" : "/lobby?tab=builds"}
            className="inline-flex min-h-11 w-fit items-center rounded-xl border border-b-4 border-border bg-card px-3 text-sm font-semibold active:translate-y-0.5 active:border-b-2"
          >
            ← {mine ? t.back : collab.lobby.shared_label}
          </Link>
          {mine && (
            <div className="flex items-center gap-2">
              <ShareSheet id={snap.id} title={snap.title} shared={snap.shared} />
              <StarButton id={snap.id} starred={isStarred(snap.stars)} />
            </div>
          )}
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
        {mine ? (
          <>
            <EditSnapshot id={snap.id} title={snap.title} notes={snap.notes} />
            <DeleteSnapshot id={snap.id} />
          </>
        ) : (
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight">{snap.title}</h1>
            <p className="text-sm text-muted-foreground">{fill(collab.page.shared_by, { name: ownerName })}</p>
            {snap.notes && <p className="text-sm break-words whitespace-pre-wrap">{snap.notes}</p>}
          </div>
        )}
        <Notes snapshotId={snap.id} notes={noteList} />
        {collaboration?.data && <LeaveButton id={collaboration.data.id} label={collab.lobby.leave} />}
      </aside>
    </div>
  );
}
