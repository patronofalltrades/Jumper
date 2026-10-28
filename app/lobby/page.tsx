import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LogOutForm } from "@/components/auth/log-out-form";
import { BoardArt } from "@/components/art/board-art";
import { Backdrop } from "@/components/backdrop";
import { CardRow } from "@/components/card-row";
import { InviteActions } from "@/components/collaborate/invite-actions";
import { Dock } from "@/components/dock";
import { ContinueCard, DarkCard, pairs, ProjectCard, TabSwitch, type Tab } from "@/components/lobby-cards";
import { Logo } from "@/components/logo";
import collab from "@/content/ui/collaborate.json";
import features from "@/content/features.json";
import { loadCatalog, shortName } from "@/lib/game/featured";
import { avatarSrc } from "@/lib/profile/form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Lobby · Jumper" };

export default function LobbyPage({ searchParams }: PageProps<"/lobby">) {
  return (
    <>
      <Backdrop />
      <main className="flex w-full flex-1 flex-col gap-6 py-5 sm:gap-10 sm:py-8">
        <Suspense fallback={<p className="px-4 font-semibold text-white sm:px-8">Loading your lobby…</p>}>
          {searchParams.then(({ tab }) => (
            <Lobby tab={tab === "builds" ? "builds" : "projects"} />
          ))}
        </Suspense>
      </main>
    </>
  );
}

async function Lobby({ tab }: { tab: Tab }) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) redirect("/login");

  const [{ data: profile }, { catalog, featured }] = await Promise.all([
    supabase.from("profiles").select("display_name, xp, avatar").eq("id", auth.claims.sub).maybeSingle(),
    loadCatalog(supabase),
  ]);
  const name = profile?.display_name || auth.claims.email?.split("@")[0] || "there";
  const hero = featured && <ContinueCard featured={featured} name={name} />;

  return (
    <>
      <header className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-5 px-4 sm:grid-cols-[1fr_auto_1fr] sm:px-8">
        <Logo onDark />
        <TabSwitch tab={tab} />
        <div className="col-start-2 row-start-1 flex items-center justify-end gap-2 sm:col-start-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 font-mono text-sm font-semibold text-white">
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" fill="var(--probe)" />
            </svg>
            {profile?.xp ?? 0} XP
          </span>
          <Link href="/profile" aria-label="Profile" className="shrink-0 rounded-full ring-white/30 hover:ring-2">
            <Image src={avatarSrc(profile?.avatar)} alt="" width={36} height={36} className="size-9 rounded-full" />
          </Link>
          <LogOutForm>
            <button type="submit" className="rounded-full px-3 py-1.5 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white">
              Log out
            </button>
          </LogOutForm>
        </div>
      </header>

      <h1 className="sr-only">Lobby</h1>
      {tab === "projects" ? (
        <CardRow label="Projects">
          {[
            ...(await inviteCards(supabase, auth.claims.sub)),
            hero,
            ...pairs(catalog.filter((p) => p !== featured?.project)).map((pair) => (
              <div key={pair[0].id} className="flex h-full flex-col gap-3">
                {pair.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            )),
            ...features.map((feature) => (
              <DarkCard key={feature.title} label="Coming soon" title={feature.title}>
                <p className="text-sm text-white/70">{feature.description}</p>
              </DarkCard>
            )),
          ].filter(Boolean)}
        </CardRow>
      ) : (
        <>
          <CardRow label="My builds">{[hero, ...(await builds(supabase, auth.claims.sub))].filter(Boolean)}</CardRow>
          {await sharedRow(supabase, auth.claims.sub)}
        </>
      )}
      <Dock active={tab === "builds" ? "builds" : "lobby"} />
    </>
  );
}

type Client = Awaited<ReturnType<typeof createClient>>;
const fill = (template: string, values: Record<string, string>) => template.replace(/\{(\w+)\}/g, (_, k: string) => values[k]);

// The invites for the email of this user, as dark cards with Accept and Decline (issue #88). The query asks for the
// rows with no collaborator yet that this user does not own: the invites for this user.
async function inviteCards(supabase: Client, sub: string) {
  const { data, error } = await supabase
    .from("collaborators")
    .select("id, projects(title), profiles!owner_id(display_name)")
    .is("collaborator_id", null)
    .neq("owner_id", sub)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((invite) => {
    const name = (invite.profiles as unknown as { display_name: string | null } | null)?.display_name || collab.lobby.someone;
    const project = shortName((invite.projects as unknown as { title: string }).title);
    return (
      <DarkCard key={invite.id} label={collab.lobby.invite_label} title={fill(collab.lobby.invite_title, { name, project })}>
        <p className="mb-4 text-sm text-white/70">{fill(collab.lobby.invite_text, { name })}</p>
        <InviteActions id={invite.id} />
      </DarkCard>
    );
  });
}

// "Shared with me": the snapshots of the owners that this user joined, as dark cards. Row-level security gives only
// the snapshots of the joined projects. Nothing shows when this user joined no project.
async function sharedRow(supabase: Client, sub: string) {
  const [shared, joined] = await Promise.all([
    supabase
      .from("snapshots")
      .select("id, title, created_at, levels(position, title, projects(board)), profiles!user_id(display_name)")
      .neq("user_id", sub)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase.from("collaborators").select("id", { count: "exact", head: true }).eq("collaborator_id", sub),
  ]);
  if (shared.error) throw shared.error;
  if (joined.error) throw joined.error;
  if (!shared.data.length && !joined.count) return null;

  const cards = shared.data.length
    ? shared.data.map((snap) => {
        const level = snap.levels as unknown as { position: number; title: string; projects: { board: string } };
        const name = (snap.profiles as unknown as { display_name: string | null } | null)?.display_name || collab.lobby.someone;
        return (
          <Link key={snap.id} href={`/snapshots/${snap.id}`} className="contents">
            <DarkCard label={fill(collab.lobby.shared_by, { name })} title={snap.title}>
              <p className="text-sm text-white/70">
                Level {level.position} · {level.title}
              </p>
              <BoardArt board={level.projects.board} className="mt-auto w-full" />
            </DarkCard>
          </Link>
        );
      })
    : [
        <DarkCard key="empty" label={collab.lobby.shared_label} title={collab.lobby.shared_empty_title}>
          <p className="text-sm text-white/70">{collab.lobby.shared_empty}</p>
        </DarkCard>,
      ];
  return (
    <section className="flex flex-col gap-3">
      <h2 className="px-4 text-xl font-extrabold tracking-tight text-white sm:px-8">{collab.lobby.shared_label}</h2>
      <CardRow label={collab.lobby.shared_label}>{cards}</CardRow>
    </section>
  );
}

// The user's snapshots as dark cards, newest first. Each card opens its snapshot page.
async function builds(supabase: Client, sub: string) {
  // Row-level security also gives the snapshots that friends share with this user (issue #88): they have their own row.
  const { data, error } = await supabase
    .from("snapshots")
    .select("id, title, created_at, levels(position, title, projects(board))")
    .eq("user_id", sub)
    .order("created_at", { ascending: false })
    .limit(12);
  if (error) throw error;

  if (!data?.length) {
    return [
      <DarkCard key="empty" label="My builds" title="No builds yet">
        <p className="text-sm text-white/70">When you save a snapshot of your board in build mode, it shows here.</p>
        <BoardArt board="ESP32-S3" className="mt-auto w-full opacity-40" />
      </DarkCard>,
    ];
  }
  return data.map((snap) => {
    const level = snap.levels as unknown as { position: number; title: string; projects: { board: string } };
    const date = new Date(snap.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    return (
      // `contents`: the link adds no box, so the card keeps its place in the card row.
      <Link key={snap.id} href={`/snapshots/${snap.id}`} className="contents">
        <DarkCard label={date} title={snap.title}>
          <p className="text-sm text-white/70">
            Level {level.position} · {level.title}
          </p>
          <BoardArt board={level.projects.board} className="mt-auto w-full" />
        </DarkCard>
      </Link>
    );
  });
}
