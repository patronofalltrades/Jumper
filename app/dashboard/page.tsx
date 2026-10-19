import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { Backdrop } from "@/components/backdrop";
import { MistakeChart } from "@/components/dashboard/mistake-chart";
import { Dock } from "@/components/dock";
import { Button } from "@/components/ui/button";
import text from "@/content/ui/dashboard.json";
import { completedSessions, firstTryPassRate, levelsCompleted, mistakesByType, type Session } from "@/lib/stats/dashboard";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard · Jumper" };

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k]));
const labels: Record<string, string> = text.mistakes;

// The dashboard (PLAN.md feature 10, TRD 4): levels completed, completed sessions, XP, first-try pass rate, and the
// mistakes that the learner makes most. Row-level security gives only the user's own sessions and attempts.
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

  const [profile, sessions, attempts] = await Promise.all([
    supabase.from("profiles").select("xp").eq("id", auth.claims.sub).maybeSingle(),
    supabase.from("sessions").select("level_id, status"),
    supabase.from("attempts").select("level_id, passed, mistake_type, created_at"),
  ]);
  for (const result of [profile, sessions, attempts]) if (result.error) throw result.error;

  const mySessions = (sessions.data ?? []).map((s) => ({ levelId: s.level_id, status: s.status as Session["status"] }));
  const myAttempts = (attempts.data ?? []).map((a) => ({ levelId: a.level_id, passed: a.passed, mistakeType: a.mistake_type, createdAt: a.created_at }));
  const rate = firstTryPassRate(myAttempts);
  const mistakes = mistakesByType(myAttempts).map((m) => ({ label: labels[m.type] ?? labels.other, count: m.count }));

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
