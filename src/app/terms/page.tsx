import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/site/PublicShell";
import { getSessionUser } from "@/lib/auth";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/contact";
import {
  LEGAL_UPDATED_ON,
  OPERATOR_COUNTRY,
  OPERATOR_NAME,
} from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Use",
};

export const dynamic = "force-dynamic";

export default async function TermsPage() {
  const session = await getSessionUser();

  return (
    <PublicShell homeHref={session?.username ? "/passport" : "/"} wide>
      <article className="legal-doc">
        <h1 className="mark text-3xl text-ink">Terms of Use</h1>
        <p className="legal-updated">Last updated {LEGAL_UPDATED_ON}</p>

        <p>
          These terms are the agreement between you and {OPERATOR_NAME} when you create an
          account or use the site. {OPERATOR_NAME} is a hobby climbing log operated from{" "}
          {OPERATOR_COUNTRY}. If you do not agree, do not sign up.
        </p>

        <h2>The service</h2>
        <p>
          {OPERATOR_NAME} is a personal climbing log: you stamp gyms and rocks you have
          visited and the highest grade you climbed there. It is provided as a hobby
          project, “as is”, without a promise that it will always be available or error
          free. Gym names and house grades are for logging only — we are not affiliated
          with those gyms.
        </p>

        <h2>Your account</h2>
        <p>
          You need an email, a username, and a password. Keep your password to yourself.
          You are responsible for activity on your account. You must be at least 13.
        </p>
        <p>
          You can change your username or password in the app (Profile → Account →
          Manage account). You can delete your account there too; that removes your
          login, profile, stamps, and grade-chart files you uploaded.
          You can also email{" "}
          <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a> and we will delete it for you.
        </p>

        <h2>Your content</h2>
        <p>
          You keep ownership of notes, usernames, and photos you upload. You give us
          permission to store them and to show shared catalog data (places and grade
          charts) to other signed-in climbers, which is how the log works. New places
          you add stay searchable as unverified until a second climber stamps the same
          row. Do not upload anything you do not have the right to share. Grade-chart
          photos are stored so others can see the gym’s scale — do not upload private or
          unrelated images.
        </p>
        <p>
          Optional clip links must be public TikTok, Instagram, or YouTube URLs. Those
          platforms’ terms apply to the videos themselves.
        </p>

        <h2>Be decent</h2>
        <p>
          Do not use {OPERATOR_NAME} to harass people, spam the catalog with fake gyms,
          scrape other climbers’ data, break the law, or try to access someone else’s
          account. You can report a place that looks wrong from the stamp sheet. We can
          hide a listing or suspend an account that abuses the service.
        </p>

        <h2>House grades</h2>
        <p>
          V-scale mappings on house grades are community approximations, not official
          conversions. Use them as a rough comparison, not as a guarantee.
        </p>

        <h2>Privacy</h2>
        <p>
          How we collect and use personal data is explained in the{" "}
          <Link href="/privacy">Privacy Policy</Link>, including overseas hosting
          (Vercel and Supabase) and your PDPA rights.
        </p>

        <h2>Liability</h2>
        <p>
          Climbing is dangerous; this app does not make it safer. To the fullest extent
          the law allows, we are not liable for lost stamps, downtime, or anything you
          do at a gym or crag after using the log. If a court says we cannot exclude
          liability in your country, our liability is limited to what you paid us for
          the service in the last 12 months (currently: nothing, unless that changes).
        </p>

        <h2>Changes</h2>
        <p>
          We may update these terms. The date at the top will change. Continued use after
          an update means you accept the new terms.
        </p>

        <h2>Contact</h2>
        <p>
          <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a>
          {" · "}
          <Link href="/help">Help & feedback</Link>
          {" · "}
          <Link href="/privacy">Privacy Policy</Link>
        </p>
      </article>
    </PublicShell>
  );
}
