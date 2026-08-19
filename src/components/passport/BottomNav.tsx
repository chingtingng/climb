"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GymsIcon, HomeIcon, PlusIcon, ProfileIcon } from "./icons";
import { usePassport } from "./PassportContext";

const ITEMS = [
  { href: "/passport", label: "Home", match: "home" as const },
  { href: "/passport/gyms", label: "Places", match: "gyms" as const },
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
  const { configured, openLog } = usePassport();

  return (
    <div className="dock-wrap">
      <button
        type="button"
        onClick={() => openLog()}
        disabled={!configured}
        className="dock-fab"
        aria-label="Log a visit"
      >
        <PlusIcon />
        <span className="dock-fab-label">Log a visit</span>
      </button>

      <nav className="dock" aria-label="Primary">
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
              className="dock-item"
            >
              <span className="dock-icon">
                <Icon filled={active} />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
