import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { logOut } from "@/app/actions/auth";
import { changePassword, updateProfile } from "@/app/actions/profile";
import { Backdrop } from "@/components/backdrop";
import { Dock } from "@/components/dock";
import { AccountForm, PasswordForm } from "@/components/profile/profile-forms";
import { Button } from "@/components/ui/button";
import text from "@/content/ui/profile.json";
import { avatarSrc } from "@/lib/profile/form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Profile · Jumper" };

// The profile page (PLAN.md feature 17): email, XP and the date the learner joined; the display name and the
// character; a new password; log out.
export default function ProfilePage() {
  return (
    <>
      <Backdrop />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-8">
        <header>
          <h1 className="text-4xl leading-none font-extrabold tracking-tight text-white">{text.heading}</h1>
          <p className="mt-2 text-white/70">{text.text}</p>
        </header>
        <Suspense fallback={<p className="font-semibold text-white">Loading your profile…</p>}>
          <Profile />
        </Suspense>
      </main>
      <Dock active="profile" />
    </>
  );
}

async function Profile() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("display_name, xp, avatar, created_at")
    .eq("id", auth.claims.sub)
    .maybeSingle();
  if (error) throw error;

  const email = auth.claims.email ?? "";
  const name = profile?.display_name || email.split("@")[0];
  const joined = profile ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "–";

  return (
    <>
      <section className="flex items-center gap-4 rounded-2xl bg-card p-5 shadow-panel">
        <Image src={avatarSrc(profile?.avatar)} alt="" width={80} height={80} className="size-20 shrink-0 rounded-full" priority />
        <div className="min-w-0">
          <p className="truncate text-2xl font-extrabold tracking-tight">{name}</p>
          <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 text-sm">
            <dt className="text-muted-foreground">{text.email}</dt>
            <dd className="truncate">{email}</dd>
            <dt className="text-muted-foreground">{text.xp}</dt>
            <dd className="font-mono font-semibold">{profile?.xp ?? 0}</dd>
            <dt className="text-muted-foreground">{text.joined}</dt>
            <dd>{joined}</dd>
          </dl>
        </div>
      </section>
      <section className="rounded-2xl bg-card p-5 shadow-panel">
        <AccountForm action={updateProfile} name={name} avatar={profile?.avatar ?? ""} />
      </section>
      <section className="rounded-2xl bg-card p-5 shadow-panel">
        <PasswordForm action={changePassword} />
      </section>
      <form action={logOut}>
        <Button type="submit" variant="outline" className="min-h-11">
          {text.log_out}
        </Button>
      </form>
    </>
  );
}
