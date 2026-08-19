import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { BrandStamp } from "@/components/BrandStamp";
import { getSessionUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";

const HIGHLIGHTS = [
  "Stamp every gym, crag and boulder you visit",
  "Keep your highest grade per place",
  "Watch your passport fill up, country by country",
];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ authError?: string }>;
}) {
  const session = await getSessionUser();
  if (session) redirect("/passport");

  const configured = isSupabaseConfigured();
  const params = await searchParams;

  return (
    <main className="app-shell flex flex-col justify-center gap-7">
      <header className="fade-up flex flex-col items-center text-center">
        <BrandStamp className="float-soft" />
        <p className="eyebrow mt-5">Climbing log</p>
        <h1 className="wordmark mt-1.5 text-[2.7rem] leading-[0.95] text-ink">
          Chalk Passport
        </h1>
        <p className="auth-subtitle">
          A little passport for your climbing — stamp the places you’ve sent, by
          country, city and grade.
        </p>
      </header>

      <div className="fade-up-delay">
        <LoginForm configured={configured} authError={params.authError} />
      </div>

      <ul className="fade-up-delay-2 mx-auto flex w-full max-w-[20rem] flex-col gap-2">
        {HIGHLIGHTS.map((item) => (
          <li
            key={item}
            className="flex items-start gap-2.5 text-[0.82rem] leading-snug text-ink-soft"
          >
            <span
              aria-hidden
              className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-sky-200 text-[0.6rem] font-bold text-sky-700"
            >
              ✓
            </span>
            {item}
          </li>
        ))}
      </ul>

      <footer className="fade-up-delay-2 pb-1 text-center text-[0.8rem] text-ink-faint">
        Made for{" "}
        <a
          href="https://www.instagram.com/chalkchingup"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-sky-700 underline decoration-sky-300 decoration-2 underline-offset-4 transition hover:text-sky-800"
        >
          @chalkchingup
        </a>
      </footer>
    </main>
  );
}
