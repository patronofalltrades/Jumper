import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { Backdrop } from "@/components/backdrop";
import { MistakeChart } from "@/components/dashboard/mistake-chart";
import { TermsDictionary } from "@/components/dashboard/terms-dictionary";
import { Dock } from "@/components/dock";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import text from "@/content/ui/dashboard.json";
import { loadTerms } from "@/lib/content/terms";
import { shortName } from "@/lib/game/featured";
import { completedSessions, firstTryPassRate, levelsCompleted, mistakesByType, topMistakes, type Session } from "@/lib/stats/dashboard";
import { termsByLetter, termsLearned } from "@/lib/stats/terms";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard · Jumper" };

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k]));
const labels: Record<string, string> = text.mistakes;

// Where a level is: its project, the short name of the project, and the position of the level (for /p/<project>/<level>).
type Where = { project: string; name: string; level: number };

// The dashboard (PLAN.md feature 10, TRD 4): levels completed, completed sessions, XP, first-try pass rate, the mistakes
// that the learner makes most, and the terms of the levels that the learner passed. Row-level security gives only the
// user's own sessions and attempts.
export default function DashboardPage() {
  return (
    <>
      <Backdrop />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-8">
        <header>
          <h1 className="text-4xl leading-none font-extrabold tracking-tight text-white">{text.heading}</h1>
          <p className="mt-2 text-white/70">{text.text}</p>
        </header>
        <Suspense fallback={<p className="font-semibold text-white">Loading your numbers…</p>}>
          <Dashboard />
        </Suspense>
      </main>
      <Dock active="dashboard" />
    </>
  );
}

async function Dashboard() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) redirect("/login");

  const [profile, sessions, attempts, levels] = await Promise.all([
    supabase.from("profiles").select("xp").eq("id", auth.claims.sub).maybeSingle(),
    supabase.from("sessions").select("level_id, status"),
    supabase.from("attempts").select("level_id, passed, mistake_type, created_at"),
    supabase.from("levels").select("id, position, projects(slug, title)"),
  ]);
  for (const result of [profile, sessions, attempts, levels]) if (result.error) throw result.error;

  const mySessions = (sessions.data ?? []).map((s) => ({ levelId: s.level_id, status: s.status as Session["status"] }));
  const myAttempts = (attempts.data ?? []).map((a) => ({ levelId: a.level_id, passed: a.passed, mistakeType: a.mistake_type, createdAt: a.created_at }));
  const rate = firstTryPassRate(myAttempts);
  const mistakes = mistakesByType(myAttempts).map((m) => ({ label: labels[m.type] ?? labels.other, count: m.count }));

  // The database id of each level (attempts and sessions use it) and where the level is.
  const where = new Map<number, Where>(
    (levels.data ?? []).map((l) => {
      const project = l.projects as unknown as { slug: string; title: string };
      return [l.id, { project: project.slug, name: shortName(project.title), level: l.position }];
    }),
  );
  const top = topMistakes(myAttempts).flatMap((m) => {
    const w = where.get(m.levelId);
    return w ? [{ ...m, ...w, label: labels[m.type] ?? labels.other }] : [];
  });
  const passed = mySessions.filter((s) => s.status === "completed").flatMap((s) => where.get(s.levelId) ?? []);
  const names = new Map([...where.values()].map((w) => [w.project, w.name]));
  const groups = termsByLetter(termsLearned(loadTerms(), passed));

  return (
    <>
      {!rate && (
        <section className="flex flex-col items-start gap-3 rounded-2xl bg-card p-5 shadow-panel">
          <h2 className="text-xl font-extrabold tracking-tight">{text.empty.heading}</h2>
          <p className="text-sm text-muted-foreground">{text.empty.text}</p>
          <Button asChild className="min-h-11">
            <Link href="/play">{text.empty.button}</Link>
          </Button>
        </section>
      )}

      <dl className="grid grid-cols-2 gap-3">
        <Stat label={text.stats.levels} value={levelsCompleted(mySessions)} />
        <Stat label={text.stats.sessions} value={completedSessions(mySessions)} />
        <Stat label={text.stats.xp} value={profile.data?.xp ?? 0} />
        <Stat
          label={text.stats.first_try}
          value={rate ? `${rate.percent}%` : "–"}
          detail={rate ? fill(text.stats.first_try_detail, { passed: rate.passed, levels: rate.levels }) : text.stats.first_try_none}
        />
      </dl>

      {top.length > 0 && (
        <section className="flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-panel">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">{text.top.heading}</h2>
            <p className="text-sm text-muted-foreground">{text.top.text}</p>
          </div>
          <ul className="flex flex-col gap-2">
            {top.map((m) => (
              <li key={m.type} className="flex items-center justify-between gap-3 rounded-xl bg-muted px-3 py-3">
                <div className="min-w-0">
                  <p className="font-semibold">{m.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {m.count === 1 ? text.chart.count_one : fill(text.chart.count, { n: m.count })} · {fill(text.top.level, { project: m.name, n: m.level })}
                  </p>
                </div>
                <Button asChild className="min-h-11 shrink-0">
                  <Link href={`/p/${m.project}/${m.level}`}>{text.top.practise}</Link>
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-panel">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">{text.chart.heading}</h2>
          <p className="text-sm text-muted-foreground">{text.chart.text}</p>
        </div>
        {mistakes.length ? (
          <MistakeChart data={mistakes} one={text.chart.count_one} many={text.chart.count} />
        ) : (
          <p className="rounded-xl bg-muted px-3 py-3 text-sm text-muted-foreground">{text.chart.empty}</p>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-panel">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">{text.terms.heading}</h2>
          <p className="text-sm text-muted-foreground">{text.terms.text}</p>
        </div>
        {groups.length ? (
          <TermsDictionary
            groups={groups}
            source={(t) => names.get(t.project) ?? t.project}
            where={(t) => fill(text.terms.level, { project: names.get(t.project) ?? t.project, n: t.level })}
          />
        ) : (
          <p className="rounded-xl bg-muted px-3 py-3 text-sm text-muted-foreground">{text.terms.empty}</p>
        )}
      </section>

      <section className="flex flex-col gap-2 rounded-2xl bg-card p-5 opacity-60 shadow-panel">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-extrabold tracking-tight">{text.flashcards.heading}</h2>
          <Badge>{text.flashcards.soon}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{text.flashcards.text}</p>
      </section>
    </>
  );
}

function Stat({ label, value, detail }: { label: string; value: ReactNode; detail?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-card p-4 shadow-panel">
      <dt className="text-sm font-semibold text-muted-foreground">{label}</dt>
      <dd className="font-mono text-4xl font-bold tracking-tight">{value}</dd>
      {detail && <dd className="text-xs text-muted-foreground">{detail}</dd>}
    </div>
  );
}
