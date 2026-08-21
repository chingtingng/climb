import Link from "next/link";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/contact";

const LINKS = [
  { href: "/help", label: "Help" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const;

export function SiteFooter({ className = "" }: { className?: string }) {
  return (
    <footer className={`site-footer ${className}`.trim()}>
      <nav aria-label="Legal and support" className="site-footer-nav">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
        <a href={SUPPORT_MAILTO} title={SUPPORT_EMAIL}>
          Contact us
        </a>
      </nav>
    </footer>
  );
}
