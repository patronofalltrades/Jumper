import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { logOut } from "@/app/actions/auth";
import { Backdrop } from "@/components/backdrop";
import { Dock } from "@/components/dock";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Coming soon · Jumper" };

// Dock pages that are not built yet.
const PAGES = {
  profile: { title: "Profile", text: "Your name and your account settings." },
} as const;

export default function SoonPage({ params }: PageProps<"/soon/[page]">) {
  return (
    <>
      <Backdrop />
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <Suspense>{params.then(({ page }) => <Soon page={page} />)}</Suspense>
      </main>
    </>
  );
}

function Soon({ page }: { page: string }) {
  if (!(page in PAGES)) notFound();
  const { title, text } = PAGES[page as keyof typeof PAGES];
  return (
    <>
      <section className="flex w-full max-w-md flex-col gap-4 rounded-[28px] bg-card p-6 shadow-panel sm:p-8">
        <Badge>Coming soon</Badge>
        <h1 className="text-5xl leading-[0.95] font-extrabold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{text}</p>
        <div className="mt-2 flex flex-wrap gap-3">
          <Button asChild className="min-h-11">
            <Link href="/lobby">Back to the lobby</Link>
          </Button>
          {page === "profile" && (
            <form action={logOut}>
              <Button type="submit" variant="outline" className="min-h-11">
                Log out
              </Button>
            </form>
          )}
        </div>
      </section>
      <Dock active={page as "profile"} />
    </>
  );
}
