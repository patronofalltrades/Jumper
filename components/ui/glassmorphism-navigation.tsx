"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface NavItem {
  name: string;
  href: string;
  /** A rendered icon, for example `<Home size={18} />`. An element, not a component, so a server page can pass it. */
  icon: ReactNode;
}

interface GlassmorphismNavBarProps {
  items: NavItem[];
  /** The name of the item that is lit when the page opens. */
  active?: string;
  /** Shows before the items, for example the logo. */
  start?: ReactNode;
  /** Shows after the items, for example the Log in button. */
  end?: ReactNode;
  className?: string;
}

// A floating frosted-glass pill nav (issue #152), from the 21st.dev "glassmorphism navigation" component.
// Changes: real links, no theme toggle (Jumper follows the system theme), slots for the logo and an end button, and
// Jumper colors. It sits on the night backdrop, so the glass is dark in both themes.
// Phone: the items show only their icon, with the name for screen readers. Laptop: the name.
export function GlassmorphismNavBar({ items, active, start, end, className }: GlassmorphismNavBarProps) {
  const [current, setCurrent] = useState(active ?? items[0]?.name);

  return (
    <nav
      aria-label="Site"
      className={cn(
        "flex items-center gap-1 rounded-full border border-white/10 bg-night-2/55 p-1 text-white shadow-[0_10px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl backdrop-saturate-[1.8]",
        className,
      )}
    >
      {start}
      {items.map(({ name, href, icon }) => {
        const isActive = current === name;
        return (
          <Link
            key={name}
            href={href}
            onClick={() => setCurrent(name)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative flex min-h-11 min-w-11 items-center justify-center rounded-full px-3 text-sm font-semibold transition-colors sm:px-5",
              isActive ? "text-[#22d66b]" : "text-white/75 hover:text-white",
            )}
          >
            <span className="hidden sm:inline">{name}</span>
            <span className="sm:hidden" aria-hidden="true">
              {icon}
            </span>
            <span className="sr-only sm:hidden">{name}</span>
            {isActive && (
              <motion.span
                layoutId="glass-nav-lamp"
                className="absolute inset-0 -z-10 rounded-full bg-[#22d66b]/12"
                initial={false}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <span className="absolute -top-1 left-1/2 h-1 w-8 -translate-x-1/2 rounded-t-full bg-[#22d66b] shadow-[0_0_16px_5px_rgba(34,214,107,0.45)]" />
              </motion.span>
            )}
          </Link>
        );
      })}
      {end && (
        <>
          <span className="mx-1 h-6 w-px bg-white/15" aria-hidden="true" />
          {end}
        </>
      )}
    </nav>
  );
}
