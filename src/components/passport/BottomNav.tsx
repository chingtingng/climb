"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GymsIcon, HomeIcon, ProfileIcon } from "./icons";

const ITEMS = [
  { href: "/passport", label: "Home", match: "home" as const },
  { href: "/passport/gyms", label: "Gyms", match: "gyms" as const },
  { href: "/passport/profile", label: "Profile", match: "profile" as const },
];

function activeMatch(pathname: string) {
  if (pathname.startsWith("/passport/profile")) return "profile";
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
              : ProfileIcon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-12 flex-col items-center justify-center gap-0.5 text-[0.7rem] font-semibold ${
              active ? "text-pass-primary" : "text-pass-muted"
            }`}
          >
            <Icon filled={active} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
