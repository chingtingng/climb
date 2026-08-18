import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { getSessionUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";

export default async function HomePage() {
  const session = await getSessionUser();
  if (session) redirect("/passport");

  const configured = isSupabaseConfigured();

  return (
    <main className="app-shell flex flex-col justify-center">
      <div className="fade-up">
        <LoginForm configured={configured} />
      </div>

      <footer className="fade-up-delay mt-8 pb-2 text-center text-sm text-ink-soft">
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
