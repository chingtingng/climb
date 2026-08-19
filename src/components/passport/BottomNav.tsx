"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui/cx";
import { GradesIcon, GymsIcon, HomeIcon, ProfileIcon } from "./icons";

const ITEMS = [
  { href: "/passport", label: "Home", match: "home" as const },
  { href: "/passport/gyms", label: "Places", match: "gyms" as const },
  { href: "/passport/grades", label: "Grades", match: "grades" as const },
  { href: "/passport/profile", label: "Profile", match: "profile" as const },
];

function activeMatch(pathname: string) {
  if (pathname.startsWith("/passport/profile")) return "profile";
  if (pathname.startsWith("/passport/grades")) return "grades";
  if (pathname.startsWith("/passport/gyms")) return "gyms";
  return "home";
}

export function BottomNav() {
  const pathname = usePathname();
  const current = activeMatch(pathname);

  return (
    <nav className="passport-nav" aria-label="Primary">
      {ITEMS.map((item) => {
        const active = current === item.match;
        const Icon =
          item.match === "home"
            ? HomeIcon
            : item.match === "gyms"
              ? GymsIcon
              : item.match === "grades"
                ? GradesIcon
                : ProfileIcon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "flex min-h-11 w-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-full py-1 text-xs font-semibold",
              active ? "bg-sky-100 text-ink" : "text-ink-soft",
            )}
          >
            <Icon filled={active} />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
