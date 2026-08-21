"use client";

import { useRouter } from "next/navigation";
import { formatStampDate } from "@/lib/dates";
import { formatGymPlace, formatVisitPlace, findGymBySlug } from "@/lib/gyms";
import { isUnverifiedPlace, sameCountry } from "@/lib/gymCatalog";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { GradeBadge } from "@/components/ui/GradeBadge";
import { DisciplineMark, PlaceKindMark } from "@/components/ui/Marks";
import { placeInk } from "@/components/ui/Stamp";
import { BackIcon, ChevronIcon } from "./icons";
import { CountryStamp } from "./CountryStamp";
import { usePassport } from "./PassportContext";
import { VisitMediaPreview } from "./VisitMediaPreview";

export function GymDetailView({ slug }: { slug: string }) {
  const router = useRouter();
  const { gyms, catalogGyms, configured, openLog, openEdit } = usePassport();
  const gym = findGymBySlug(gyms, slug);
  const catalogHasDbRows = catalogGyms.some((item) => item.id);
  const catalogRow =
    catalogGyms.find((item) => item.id && item.id === gym?.gymId) ??
    catalogGyms.find(
      (item) =>
        gym &&
        item.name.toLowerCase() === gym.name.toLowerCase() &&
        sameCountry(item.country, gym.country),
    );
  const hiddenFromCatalog =
    Boolean(gym?.gymId) &&
    catalogHasDbRows &&
    !catalogGyms.some((item) => item.id === gym?.gymId);
  const unverified = isUnverifiedPlace(catalogRow?.status);

  if (!gym) {
    return (
      <EmptyState
        seed="missing-stamp"
        label="?"
        title="This stamp isn’t in your passport."
        body="It may have been removed, or the link is out of date."
        actionLabel="Back to places"
        onAction={() => router.push("/passport/gyms")}
      />
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="mt-1 inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-surface shadow-soft"
          aria-label="Back"
        >
          <BackIcon />
        </button>
        <div className="min-w-0 flex-1 pt-1">
          <h1 className="mark text-2xl leading-tight break-words">{gym.name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-ink-soft">
            <PlaceKindMark kind={gym.place_kind} />
            <span aria-hidden>·</span>
            <span>{formatGymPlace(gym)}</span>
            {unverified ? (
              <>
                <span aria-hidden>·</span>
                <span className="font-semibold text-sky-700">Unverified</span>
              </>
            ) : null}
          </p>
        </div>
        <CountryStamp country={gym.country} ink={placeInk(gym.place_kind)} />
        <span className="sr-only">{gym.country}</span>
      </header>

      {gym.outlets.length > 1 ? (
        <section>
          <h2 className="mark text-xl">Outlets</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {gym.outlets.map((outlet) => (
              <span
                key={outlet}
                className="inline-flex min-h-11 items-center rounded-full bg-sky-100 px-3 text-sm font-semibold text-sky-700"
              >
                {outlet}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid grid-cols-2 gap-2.5 wide:grid-cols-3">
        <Card className="flex flex-col items-start px-4 py-4 text-left">
          <p className="label-micro">Highest grade</p>
          <GradeBadge
            className="mt-2"
            system={gym.bestGradeSystem}
            grade={gym.bestGrade}
            vEquiv={gym.bestVEquiv}
          />
        </Card>
        <Card className="flex flex-col items-start px-4 py-4 text-left">
          <p className="label-micro">Visits</p>
          <p className="mark mt-2 text-xl leading-none tabular-nums">
            {gym.visitCount}
          </p>
        </Card>
        <Card className="hidden flex-col items-start px-4 py-4 text-left wide:flex">
          <p className="label-micro">Last visit</p>
          <p className="mark mt-2 text-lg leading-tight">
            {formatStampDate(gym.lastVisited)}
          </p>
        </Card>
      </section>

      <section>
        <h2 className="mark text-xl">Visit history</h2>
        <ul className="mt-3 space-y-2">
          {gym.visits.map((visit) => (
            <li key={visit.id}>
              <Card className="px-3 py-2.5">
                <div className="flex flex-col gap-3">
                <button
                  type="button"
                  disabled={!configured}
                  onClick={() => openEdit(visit)}
                  className="flex min-h-11 min-w-0 items-center gap-3 rounded-md text-left hover:bg-sky-50 disabled:text-ink"
                  aria-label={`Edit visit on ${formatStampDate(visit.visited_on)}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{formatStampDate(visit.visited_on)}</p>
                    <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-ink-soft">
                      <span>{formatVisitPlace(visit)}</span>
                      <span aria-hidden>·</span>
                      <DisciplineMark type={visit.climbing_type} />
                      <span aria-hidden>·</span>
                      <GradeBadge
                        system={visit.grade_system}
                        grade={visit.highest_grade}
                        vEquiv={visit.v_equiv}
                      />
                    </p>
                    {visit.notes ? (
                      <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                        {visit.notes}
                      </p>
                    ) : null}
                  </div>
                  <ChevronIcon className="size-4 shrink-0 -rotate-90 text-ink-soft" />
                </button>
                <VisitMediaPreview videoPath={visit.video_path} />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      {hiddenFromCatalog ? (
        <p className="text-sm leading-relaxed text-ink-soft">
          This place was hidden from the catalog. Your stamps are still here; you
          can’t add another visit to it.
        </p>
      ) : (
        <Button
          type="button"
          disabled={!configured}
          className="desktop:!w-auto desktop:min-w-56"
          onClick={() =>
            openLog({
              name: gym.name,
              city: gym.city,
              country: gym.country,
              existing: true,
            })
          }
        >
          + Log another visit
        </Button>
      )}
    </div>
  );
}
