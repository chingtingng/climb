import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { SiteFooter } from "@/components/site/SiteFooter";
import { getSessionUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ authError?: string }>;
}) {
  const session = await getSessionUser();
  if (session?.username) redirect("/passport");
  if (session) redirect("/welcome");

  const configured = isSupabaseConfigured();
  const params = await searchParams;

  return (
    <main className="auth-page">
      <div className="fade-up auth-page-card">
        <LoginForm configured={configured} authError={params.authError} />
      </div>
      <SiteFooter className="fade-up-delay" />
    </main>
  );
}
