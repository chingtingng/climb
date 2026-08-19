"use client";

import { useRouter } from "next/navigation";
import { formatStampDate } from "@/lib/dates";
import { formatGymPlace, formatVisitPlace, findGymBySlug } from "@/lib/gyms";
import { BackIcon } from "./icons";
import { CountryStamp } from "./CountryStamp";
import { DeleteStampDialog } from "./DeleteStampDialog";
import { GradeLabel } from "./GradePicker";
import { usePassport } from "./PassportContext";
import { VisitMediaPreview } from "./VisitMediaPreview";

export function GymDetailView({ slug }: { slug: string }) {
  const router = useRouter();
  const { gyms, configured, openLog } = usePassport();
  const gym = findGymBySlug(gyms, slug);

  if (!gym) {
    return (
      <div className="pt-6 text-center">
        <h1 className="passport-mark text-3xl text-pass-navy">
          This stamp isn’t in your passport.
        </h1>
        <p className="mt-2 text-sm text-pass-muted">
          It may have been removed, or the link is out of date.
        </p>
        <button
          type="button"
          onClick={() => router.push("/passport/gyms")}
          className="passport-btn mt-6"
        >
          Back to gyms
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="mt-1 inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-white"
          aria-label="Back"
        >
          <BackIcon />
        </button>
        <div className="min-w-0 flex-1 pt-1">
          <h1 className="passport-mark text-[1.85rem] leading-tight break-words">
            {gym.name}
          </h1>
          <p className="mt-1 text-sm text-pass-muted">
            {formatGymPlace(gym)}
          </p>
        </div>
        <CountryStamp country={gym.country} />
      </header>

      {gym.outlets.length > 1 ? (
        <section>
          <h2 className="passport-mark text-xl">Outlets</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {gym.outlets.map((outlet) => (
              <span
                key={outlet}
                className="inline-flex min-h-10 items-center rounded-full bg-white px-3 text-sm font-semibold"
              >
                {outlet}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid grid-cols-2 gap-2.5">
        <div className="rounded-[1.2rem] bg-white px-4 py-4">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-pass-muted">
            Highest grade
          </p>
          <p className="passport-mark mt-1 text-3xl leading-none">
            <GradeLabel
              system={gym.bestGradeSystem}
              grade={gym.bestGrade}
              vEquiv={gym.bestVEquiv}
            />
          </p>
        </div>
        <div className="rounded-[1.2rem] bg-white px-4 py-4">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-pass-muted">
            Visits
          </p>
          <p className="passport-mark mt-1 text-3xl leading-none">{gym.visitCount}</p>
        </div>
      </section>

      <section>
        <h2 className="passport-mark text-xl">Visit history</h2>
        <ul className="mt-3 space-y-2">
          {gym.visits.map((visit) => (
            <li
              key={visit.id}
              className="rounded-[1.15rem] bg-white px-3 py-2.5"
            >
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{formatStampDate(visit.visited_on)}</p>
                  <p className="text-sm break-words text-pass-muted">
                    {formatVisitPlace(visit)} ·{" "}
                    <GradeLabel
                      system={visit.grade_system}
                      grade={visit.highest_grade}
                      vEquiv={visit.v_equiv}
                    />
                    {visit.notes ? ` · ${visit.notes}` : ""}
                  </p>
                </div>
                <DeleteStampDialog
                  visitId={visit.id}
                  onDeleted={() => {
                    if (gym.visitCount <= 1) router.replace("/passport/gyms");
                    router.refresh();
                  }}
                />
              </div>
              <VisitMediaPreview photoPath={visit.photo_path} videoPath={visit.video_path} />
            </li>
          ))}
        </ul>
      </section>

      <button
        type="button"
        disabled={!configured}
        onClick={() =>
          openLog({
            name: gym.name,
            city: gym.city,
            country: gym.country,
            existing: true,
          })
        }
        className="passport-btn"
      >
        + Log another visit
      </button>
    </div>
  );
}
