import type { Metadata } from "next";
import Link from "next/link";
import { WelcomeForm } from "@/components/WelcomeForm";
import { PublicShell } from "@/components/site/PublicShell";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { suggestUsername } from "@/lib/username";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Choose a username",
};

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const session = await getSessionUser();
  if (!session) redirect("/");
  if (session.username) redirect("/passport");

  let suggested = "";
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const meta = data.user?.user_metadata ?? {};
    suggested = suggestUsername(
      typeof meta.preferred_username === "string" ? meta.preferred_username : null,
      typeof meta.full_name === "string" ? meta.full_name : null,
      typeof meta.name === "string" ? meta.name : null,
      data.user?.email?.split("@")[0],
    );
  }

  return (
    <PublicShell>
      <p className="label-micro mb-2">almost there</p>
      <h1 className="mark text-3xl text-ink">Pick a username</h1>
      <p className="mt-3 mb-6 max-w-sm text-sm leading-relaxed text-ink-soft">
        This is your handle on Chalk Passport — letters, numbers, and underscores,
        like a social username.
      </p>
      <WelcomeForm suggested={suggested} />
      <p className="mt-6 text-center text-sm text-ink-soft">
        <Link href="/terms" className="underline decoration-sky-300 underline-offset-2">
          Terms
        </Link>
        {" · "}
        <Link href="/privacy" className="underline decoration-sky-300 underline-offset-2">
          Privacy
        </Link>
      </p>
    </PublicShell>
  );
}
