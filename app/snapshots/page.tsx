import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Backdrop } from "@/components/backdrop";
import { Dock } from "@/components/dock";
import { FindForm } from "@/components/snapshots/find-form";
import { StarButton } from "@/components/snapshots/star-button";
import text from "@/content/ui/snapshots.json";
import { applyFind, findHref, isFiltered, readFind, type Find } from "@/lib/snapshots/find";
import { isStarred, readView, visibleSnapshots, type View } from "@/lib/snapshots/stars";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Lab notebook · Jumper" };

const t = text.list;
const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k]));

// The lab notebook: the user's snapshots, the Starred view (issue #40), and search, filters and sort (issue #42).
export default function SnapshotsPage({ searchParams }: PageProps<"/snapshots">) {
  return (
    <>
      <Backdrop />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-8">
        <header>
          <h1 className="text-4xl leading-none font-extrabold tracking-tight text-white">{t.heading}</h1>
          <p className="mt-2 text-white/70">{t.text}</p>
        </header>
        <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
          {searchParams.then((params) => (
            <List view={readView(params.view)} find={readFind(params)} />
          ))}
        </Suspense>
      </main>
      <Dock active="builds" />
    </>
  );
}

/** All and Starred. Each tab is a link that keeps the search, the filters and the sort. */
function Tabs({ view, find }: { view: View; find: Find }) {
  const tabs = [
    { view: "all", href: findHref(find, "all"), label: t.all },
    { view: "starred", href: findHref(find, "starred"), label: t.starred },
  ] as const;
  return (
    <nav aria-label={t.tabs} className="flex w-fit gap-1 rounded-2xl bg-black/50 p-1 backdrop-blur">
      {tabs.map((tab) => (
        <Link
          key={tab.view}
          href={tab.href}
          aria-current={tab.view === view ? "page" : undefined}
          className={
            tab.view === view
              ? "inline-flex min-h-11 items-center rounded-xl bg-card px-4 text-sm font-semibold text-foreground shadow-panel"
              : "inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white"
          }
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

async function List({ view, find }: { view: View; find: Find }) {
  const supabase = await createClient();
  // Row-level security gives only the snapshots and the stars of this user, so `stars` is empty or has one row.
  const [snapshots, levels] = await Promise.all([
    applyFind(supabase.from("snapshots").select("id, title, notes, passed, mistake_count, created_at, levels(position, title), stars(snapshot_id)"), find),
    supabase.from("levels").select("id, position, title").order("project_id").order("position"),
  ]);
  if (snapshots.error) throw snapshots.error;
  if (levels.error) throw levels.error;
  const shown = visibleSnapshots(snapshots.data, view);

  return (
    <>
      <Tabs view={view} find={find} />
      {/* The key resets the boxes when a tab or the clear link opens a new URL. */}
      <FindForm key={findHref(find, view)} find={find} view={view} levels={levels.data} />
      {shown.length ? (
        <Cards snapshots={shown} />
      ) : isFiltered(find) ? (
        <div className="flex flex-col items-start gap-3 rounded-2xl bg-card p-5 shadow-panel">
          <p className="text-muted-foreground">{text.find.none}</p>
          <Link href={findHref({ ...find, q: "", level: null, result: "all" }, view)} className="font-semibold text-primary underline underline-offset-4">
            {text.find.clear}
          </Link>
        </div>
      ) : (
        <p className="rounded-2xl bg-card p-5 text-muted-foreground shadow-panel">{view === "starred" ? t.empty_starred : t.empty}</p>
      )}
    </>
  );
}

type Row = { id: string; title: string; notes: string; passed: boolean; mistake_count: number; created_at: string; levels: unknown; stars: unknown[] | null };

function Cards({ snapshots }: { snapshots: Row[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {snapshots.map((snap) => {
        const level = snap.levels as unknown as { position: number; title: string };
        const date = new Date(snap.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
        return (
          <li key={snap.id} className="relative">
            <Link
              href={`/snapshots/${snap.id}`}
              className="flex flex-col gap-1 rounded-2xl border-b-4 border-border bg-card p-4 pr-16 shadow-panel transition-[transform,border] active:translate-y-0.5 active:border-b-2"
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
            {/* Outside the link, so a press stars the snapshot and does not open it. */}
            <StarButton id={snap.id} starred={isStarred(snap.stars)} className="absolute top-3 right-3" />
          </li>
        );
      })}
    </ul>
  );
}
