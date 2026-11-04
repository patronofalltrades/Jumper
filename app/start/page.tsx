import type { Metadata } from "next";
import { Suspense } from "react";
import { Backdrop } from "@/components/backdrop";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import text from "@/content/ui/onboarding.json";
import { loadProjects } from "@/lib/content/load";
import { startAnswerFor } from "@/lib/game/onboarding";

export const metadata: Metadata = { title: text.meta.title };

// The onboarding before sign-up (issue #152). The proxy sends a logged-in user to the lobby.
// `?build=perch` (from the "I have wired a board before" button and the course tabs) selects the start answer that opens Perch.
export default function StartPage({ searchParams }: PageProps<"/start">) {
  const projects = loadProjects();
  const available = projects.filter((p) => p.status === "available").map((p) => p.slug);
  const names = Object.fromEntries(projects.map((p) => [p.slug, p.title.split(":")[0]]));

  return (
    <>
      <Backdrop />
      <main className="mx-auto flex w-full max-w-md flex-1 px-5 pt-4 pb-5 text-white sm:my-10 sm:flex-none sm:rounded-[2rem] sm:border sm:border-white/10 sm:bg-night-2/60 sm:p-6 sm:backdrop-blur-xl">
        <Suspense>
          {searchParams.then(({ build }) => (
            <OnboardingFlow available={available} names={names} initialStart={startAnswerFor(typeof build === "string" ? build : null, text.questions.start.options)} />
          ))}
        </Suspense>
      </main>
    </>
  );
}
