import { GymsView } from "@/components/passport/GymsView";

export default async function GymsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; by?: string }>;
}) {
  const params = await searchParams;
  return (
    <GymsView
      initialView={params.view === "location" ? "location" : "places"}
      initialGroupBy={params.by === "country" ? "country" : "city"}
    />
  );
}
