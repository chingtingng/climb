import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { readSession } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";

export default async function HomePage() {
  const session = await readSession();
  if (session) redirect("/passport");

  const configured = isSupabaseConfigured();

  return (
    <main className="app-shell flex flex-col justify-between">
      <div className="pt-6">
        <div className="fade-up relative overflow-hidden rounded-[2rem] px-5 pb-8 pt-10 text-center">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background:
                "linear-gradient(165deg, rgba(255,255,255,0.72) 0%, rgba(207,232,246,0.9) 48%, rgba(159,208,234,0.55) 100%)",
            }}
          />
          <div
            aria-hidden
            className="float-soft pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/50 blur-2xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-[#9fd0ea]/40 blur-3xl"
          />

          <p className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-ink-soft">
            climbing log
          </p>
          <h1 className="brand-mark text-[3.15rem] leading-[0.92] text-ink">
            Chalk
            <br />
            Passport
          </h1>
          <p className="mx-auto mt-4 max-w-[16rem] text-[0.98rem] leading-relaxed text-ink-soft">
            Stamp the gyms you’ve sent — by country, city, and highest grade.
          </p>
        </div>

        <div className="fade-up-delay mt-8">
          <LoginForm configured={configured} />
        </div>
      </div>

      <footer className="fade-up-delay-2 mt-10 pb-2 text-center text-sm text-ink-soft">
        <a
          href="https://www.instagram.com/chalkchingup"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-[#9fd0ea] underline-offset-4 transition hover:text-ink"
        >
          @chalkchingup
        </a>
      </footer>
    </main>
  );
}
