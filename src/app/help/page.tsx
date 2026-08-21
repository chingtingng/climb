import type { Metadata } from "next";
import { HelpForm } from "@/components/site/HelpForm";
import { PublicShell } from "@/components/site/PublicShell";
import { getSessionUser } from "@/lib/auth";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Help & feedback",
};

export const dynamic = "force-dynamic";

export default async function HelpPage() {
  const session = await getSessionUser();

  return (
    <PublicShell homeHref={session?.username ? "/passport" : "/"} wide>
      <h1 className="mark text-3xl text-ink">Help & feedback</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-soft">
        Questions, bugs, or ideas — write to us. The form opens your email app so the
        message goes to{" "}
        <a href={SUPPORT_MAILTO} className="font-semibold text-sky-700 underline underline-offset-2">
          {SUPPORT_EMAIL}
        </a>
        .
      </p>
      <div className="mt-6">
        <HelpForm username={session?.username} email={session?.email} />
      </div>
    </PublicShell>
  );
}
