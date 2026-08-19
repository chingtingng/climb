import { GymDetailView } from "@/components/passport/GymDetailView";

export default async function GymDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <GymDetailView slug={slug} />;
}
