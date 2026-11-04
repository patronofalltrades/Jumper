import { Cpu, Layers, LogOut, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { LogOutForm } from "@/components/auth/log-out-form";
import { TourStep } from "@/components/tour";
import type { Tab } from "@/components/lobby-cards";
import { GlassLogo } from "@/components/logo";
import { GlassmorphismNavBar } from "@/components/ui/glassmorphism-navigation";
import text from "@/content/ui/lobby.json";
import { avatarSrc } from "@/lib/profile/form";

// The lobby header: the glass nav of the landing page (Emerald Sun, issue #152), with the two lobby tabs, the XP,
// the avatar and Log out. Phone: the tabs and Log out show only their icon. `key` resets the lit tab when the tab changes.
export function LobbyHeader({
  tab,
  xp,
  avatar,
}: {
  tab: Tab;
  xp: number;
  avatar: string | null | undefined;
}) {
  return (
    <header className="sticky top-0 z-30 flex justify-center px-3 pt-1 sm:pt-0">
      {/* TourStep: the lobby tour for new users points at the top bar, the XP and the profile (components/lobby-tour.tsx). */}
      <TourStep id="nav">
      <div>
      <GlassmorphismNavBar
        key={tab}
        active={tab === "builds" ? text.tabs.builds : text.tabs.projects}
        items={[
          {
            name: text.tabs.projects,
            href: "/lobby",
            icon: <Cpu size={18} strokeWidth={2.5} />,
          },
          {
            name: text.tabs.builds,
            href: "/lobby?tab=builds",
            icon: <Layers size={18} strokeWidth={2.5} />,
          },
        ]}
        start={<GlassLogo href="/lobby" label="Jumper lobby" />}
        end={
          <div className="flex items-center gap-1.5 pr-1">
            <TourStep id="xp">
  <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-[#f5c518] px-3 font-mono text-sm font-semibold text-[#1a1400]">
                <Zap
                  size={14}
                  strokeWidth={2.5}
                  fill="currentColor"
                  aria-hidden="true"
                />
                {text.xp.replace("{xp}", String(xp))}
              </span>
            </TourStep>
            <TourStep id="profile">
  <Link
                href="/profile"
                aria-label={text.profile}
                className="shrink-0 rounded-full ring-[#22d66b]/60 hover:ring-2"
              >
                <Image
                  src={avatarSrc(avatar)}
                  alt=""
                  width={36}
                  height={36}
                  className="size-9 rounded-full"
                />
              </Link>
            </TourStep>
            <LogOutForm>
              <button
                type="submit"
                aria-label={text.logOut}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white sm:px-3"
              >
                <LogOut
                  size={18}
                  strokeWidth={2.5}
                  className="sm:hidden"
                  aria-hidden="true"
                />
                <span className="hidden sm:inline">{text.logOut}</span>
              </button>
            </LogOutForm>
          </div>
        }
      />
      </div>
      </TourStep>
    </header>
  );
}
