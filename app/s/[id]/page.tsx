import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SnapshotBoard } from "@/components/snapshots/snapshot-page";
import { buttonVariants } from "@/components/ui/button";
import text from "@/content/ui/snapshots.json";
import { loadBenchSpec } from "@/lib/content/benches";
import { readShared } from "@/lib/snapshots/share";
import { countWiring, readWiring } from "@/lib/snapshots/wiring";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: text.shared.title_suffix, robots: { index: false } };

const t = text.page;
const s = text.shared;
const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k]));

// A shared build (issue #87): open to anyone with the link, no log-in. The page reads the snapshot with the SQL function
// get_shared_snapshot, which gives a row only when the owner turned the switch on. The tables stay closed to visitors.
export default function SharedPage({ params }: PageProps<"/s/[id]">) {
  return (
    <Suspense fallback={<p className="p-4 text-muted-foreground">Loading the build…</p>}>
      {params.then(({ id }) => (
        <Shared id={id} />
      ))}
    </Suspense>
  );
}

async function Shared({ id }: { id: string }) {
  const snap = /^[0-9a-f-]{36}$/i.test(id) ? await load(id) : null;
  if (!snap) return <NotShared />;

  const bench = await loadBenchSpec(snap.project_slug);
  const parts = readWiring(snap.wiring);
  const date = new Date(snap.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="fixed inset-0 flex flex-col bg-background max-lg:overflow-y-auto lg:flex-row">
      <section className="relative h-[55vh] shrink-0 lg:h-auto lg:flex-1">
        {parts ? <SnapshotBoard id={snap.id} parts={parts} bench={bench} /> : <p className="grid h-full place-items-center p-4 text-muted-foreground">{t.broken}</p>}
        <p className="pointer-events-none absolute inset-x-3 bottom-3 rounded-xl bg-card/90 px-3 py-2 text-xs text-muted-foreground shadow-panel">{t.view_only}</p>
      </section>

      <aside className="flex flex-col gap-4 border-border bg-card p-4 lg:w-[26rem] lg:overflow-y-auto lg:border-l lg:p-6">
        <div>
          <p className="font-mono text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            {fill(text.list.level, { level: snap.level_position })} · {snap.level_title} · {date}
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">{snap.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{fill(s.by, { name: snap.owner_name ?? s.anonymous })}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
            <span className={snap.passed ? "rounded-full bg-primary px-2 py-0.5 text-primary-foreground" : "rounded-full bg-muted px-2 py-0.5"}>
              {snap.passed ? text.list.passed : text.list.not_passed}
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5">{fill(text.list.mistakes, { n: snap.mistake_count })}</span>
            {parts && <span className="rounded-full bg-muted px-2 py-0.5">{fill(t.board, countWiring(parts))}</span>}
          </div>
        </div>
        {snap.notes && (
          <div>
            <h2 className="text-sm font-semibold">{s.notes}</h2>
            <p className="mt-1 text-sm whitespace-pre-wrap">{snap.notes}</p>
          </div>
        )}
        <Link href="/" className={cn(buttonVariants(), "mt-2 min-h-11 self-start")}>
          {s.make_your_own}
        </Link>
      </aside>
    </div>
  );
}

async function load(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_shared_snapshot", { p_id: id });
  if (error) throw error;
  return readShared(data);
}

function NotShared() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background p-6 text-center">
      <div className="flex max-w-sm flex-col items-center gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">{s.not_shared}</h1>
        <p className="text-sm text-muted-foreground">{s.not_shared_text}</p>
        <Link href="/" className={cn(buttonVariants(), "mt-2 min-h-11")}>
          {s.make_your_own}
        </Link>
      </div>
    </main>
  );
}
