import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/site/PublicShell";
import { getSessionUser } from "@/lib/auth";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/contact";
import { LEGAL_UPDATED_ON } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  const session = await getSessionUser();

  return (
    <PublicShell homeHref={session?.username ? "/passport" : "/"} wide>
      <article className="legal-doc">
        <h1 className="mark text-3xl text-ink">Privacy Policy</h1>
        <p className="legal-updated">Last updated {LEGAL_UPDATED_ON}</p>

        <p>
          Chalk Passport (“we”, “us”) is a climbing log. This page explains what
          information the app collects, why, and how to reach us. It is written for this
          product — not as a generic template.
        </p>

        <h2>Who we are</h2>
        <p>
          Chalk Passport is operated by the people behind this site. For privacy questions
          or to ask us to delete your account, email{" "}
          <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a>.
        </p>

        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>Account.</strong> Username, email address, and a password (stored as a
            hash by our auth provider — we never see the plain password).
          </li>
          <li>
            <strong>Your stamps.</strong> Places you log (gym or rock, city, country,
            climbing type, grade, date, optional notes) and optional public TikTok,
            Instagram, or YouTube clip links. Stamp photos are not uploaded to us; clip
            files stay on those platforms.
          </li>
          <li>
            <strong>Shared catalog.</strong> If you add a new place, other signed-in
            climbers can see that place. If you upload a grade-chart photo, that image is
            stored so others can use the same scale. Those photos are in a public storage
            bucket (anyone with the link can open them).
          </li>
          <li>
            <strong>Technical.</strong> Session cookies so you stay signed in, plus
            standard hosting logs (IP address, browser) from the companies that run the
            site.
          </li>
        </ul>

        <h2>How we use it</h2>
        <p>
          We use this information to run Chalk Passport: create your account, show your
          passport, keep the shared list of places usable, send account emails (sign-up
          confirmation, and recovery if you ask), and fix bugs. We do not sell your
          personal information. We do not use your stamps for advertising.
        </p>

        <h2>Who can see what</h2>
        <p>
          Your visit history is private to your signed-in account. Other climbers cannot
          browse your stamps. Places and grade charts you add to the catalog are visible
          to other people using the app, because the log only works if gyms are shared.
        </p>

        <h2>Companies that process data for us</h2>
        <p>
          The app is hosted on Vercel. Accounts, the database, and grade-chart files are
          stored with Supabase (Postgres, Auth, and Storage). If you paste a social clip,
          that platform’s own privacy policy applies to the video.
        </p>

        <h2>Email</h2>
        <p>
          We send transactional mail only (confirm your address, reset access). Help
          messages you send from the in-app form go to {SUPPORT_EMAIL} through your own
          mail app — we do not store that form in our database.
        </p>

        <h2>How long we keep it</h2>
        <p>
          We keep your account and stamps while the account exists. If you ask us to
          delete your account, we will delete your Auth user, profile, stamps, and
          grade-chart files uploaded under your account, unless we must keep a limited
          record to handle abuse or a legal request. Shared catalog rows (a gym someone
          else still uses) may remain with your user id removed where we can do that
          safely.
        </p>

        <h2>Your choices</h2>
        <p>
          You can edit or delete stamps in the app. You can email us to correct your
          email, download a copy of what we hold, or delete the account. If you are in
          the UK or EEA you also have rights under UK GDPR / GDPR, including access,
          deletion, and complaint to a supervisory authority.
        </p>

        <h2>Children</h2>
        <p>
          Chalk Passport is not directed at children under 13. Do not create an account
          if you are under 13. If you believe a child has signed up, email us and we will
          delete the account.
        </p>

        <h2>Changes</h2>
        <p>
          If this policy changes in a meaningful way, we will update the date above. Keep
          using the app after a change means you accept the updated policy.
        </p>

        <h2>Contact</h2>
        <p>
          <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a>
          {" · "}
          <Link href="/help">Help & feedback</Link>
          {" · "}
          <Link href="/terms">Terms of Use</Link>
        </p>
      </article>
    </PublicShell>
  );
}
