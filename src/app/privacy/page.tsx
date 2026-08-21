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
          {OPERATOR_NAME} (“we”, “us”) is a climbing log. This page explains what
          information the app collects, why, who we share it with, and how to reach
          us. It is written for this product — not as a generic template. If you are in{" "}
          {OPERATOR_COUNTRY}, this notice is meant to meet our duties under the Personal
          Data Protection Act 2012 (PDPA).
        </p>

        <h2>Who we are</h2>
        <p>
          {OPERATOR_NAME} is a hobby project operated from {OPERATOR_COUNTRY}. For PDPA
          purposes, {OPERATOR_NAME} is the organisation that collects and uses your
          personal data. There is no separate company name.
        </p>
        <p>
          Privacy contact (questions, access, correction, or deletion):{" "}
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
            climbers can see it as unverified until a second climber stamps the same
            row. After that it is published. Anyone who has stamped a published place
            can report a listing that looks wrong; enough reports hide it from the
            picker (your existing stamps stay on your passport).
          </li>
          <li>
            <strong>Technical.</strong> Session cookies so you stay signed in, plus
            standard hosting logs (IP address, browser) from the companies that run the
            site.
          </li>
        </ul>

        <h2>How we use it (purpose)</h2>
        <p>
          We use this information only to run {OPERATOR_NAME}: create your account, show
          your passport, keep the shared list of places usable, send account emails
          (sign-up confirmation, and recovery if you ask), and fix bugs. We do not sell
          your personal information. We do not use your stamps for advertising.
        </p>
        <p>
          By creating an account you agree we may collect and use this information for
          those purposes. You can withdraw that agreement by deleting your account in the
          app (Profile → Account → Manage account → Delete account) or by emailing us.
        </p>

        <h2>Who can see what</h2>
        <p>
          Your visit history is private to your signed-in account. Other climbers cannot
          browse your stamps. Places and grade charts you add to the catalog are visible
          to other people using the app (new places start unverified), because the log
          only works if gyms are shared.
        </p>

        <h2>Companies that process data for us (including overseas)</h2>
        <p>
          The website is hosted on Vercel. Accounts and the database are stored with
          Supabase (Postgres and Auth). Those companies may
          process data outside {OPERATOR_COUNTRY}, including in the United States. We use
          them only to operate the app. If you paste a social clip, that platform’s own
          privacy policy applies to the video.
        </p>

        <h2>Email</h2>
        <p>
          We send transactional mail only (confirm your address, reset access). Help
          messages you send from the in-app form go to {SUPPORT_EMAIL} through your own
          mail app — we do not store that form in our database.
        </p>

        <h2>How long we keep it</h2>
        <p>
          We keep your account and stamps while the account exists. If you delete the
          account (in the app or by emailing us), we delete your Auth user, profile,
          and stamps, unless we must keep
          a limited record to handle abuse or a legal request. Shared catalog rows (a gym
          someone else still uses) may remain with your user id removed where we can do
          that safely.
        </p>

        <h2>Your PDPA rights</h2>
        <p>
          You can edit or delete stamps in the app. You can delete the whole account from
          Profile → Account → Manage account. You can also email {SUPPORT_EMAIL} to:
        </p>
        <ul>
          <li>ask what personal data we hold about you (access)</li>
          <li>
            correct username or password in the app (Profile → Account → Manage
            account)
          </li>
          <li>correct your email by writing to us</li>
          <li>ask us to delete the account if you cannot use the in-app button</li>
        </ul>
        <p>
          We will handle these requests as soon as we reasonably can. If you are not
          satisfied, you may contact the Personal Data Protection Commission (PDPC) in
          Singapore.
        </p>
        <p>
          If you are in the UK or EEA, you may also have rights under UK GDPR / GDPR,
          including complaint to a supervisory authority there.
        </p>

        <h2>Children</h2>
        <p>
          {OPERATOR_NAME} is not directed at children under 13. Do not create an account
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
