import Link from "next/link";
import type { ReactNode } from "react";
import { SiteFooter } from "./SiteFooter";

export function PublicShell({
  homeHref = "/",
  children,
  wide = false,
}: {
  homeHref?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <main className={wide ? "legal-shell" : "app-shell"}>
      <p className="mb-6">
        <Link href={homeHref} className="mark text-lg text-ink">
          Chalk Passport
        </Link>
      </p>
      {children}
      <SiteFooter className="mt-10" />
    </main>
  );
}
