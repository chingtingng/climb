"use client";

import { useRouter } from "next/navigation";
import { formatClimbingType } from "@/lib/climbingTypes";
import { formatStampDate } from "@/lib/dates";
import { formatGymPlace, formatVisitPlace, findGymBySlug } from "@/lib/gyms";
import { formatPlaceKind } from "@/lib/placeKinds";
import { BackIcon, PlusIcon } from "./icons";
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
      <div className="card-tint mt-4 px-5 py-10 text-center">
        <h1 className="wordmark text-2xl text-ink">
          This stamp isn’t in your passport
        </h1>
        <p className="mt-2 text-[0.88rem] text-ink-soft">
          It may have been removed, or the link is out of date.
        </p>
        <button
          type="button"
          onClick={() => router.push("/passport/gyms")}
          className="btn btn-primary mt-6"
        >
          Back to places
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="icon-btn"
          aria-label="Back"
        >
          <BackIcon />
        </button>
        <p className="eyebrow">{formatPlaceKind(gym.place_kind)}</p>
      </div>

      <header className="card-tint flex items-start gap-3.5 px-4 py-4">
        <div className="min-w-0 flex-1">
          <h1 className="wordmark text-[1.7rem] leading-tight break-words text-ink">
            {gym.name}
          </h1>
          <p className="mt-1 text-[0.85rem] text-ink-soft">{formatGymPlace(gym)}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="pill-tag">
              Best{" "}
              <GradeLabel
                system={gym.bestGradeSystem}
                grade={gym.bestGrade}
                vEquiv={gym.bestVEquiv}
              />
            </span>
            <span className="pill-tag">
              {gym.visitCount} {gym.visitCount === 1 ? "visit" : "visits"}
            </span>
          </div>
        </div>
        <CountryStamp country={gym.country} />
      </header>

      {gym.outlets.length > 1 ? (
        <section>
          <h2 className="section-title">Outlets</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {gym.outlets.map((outlet) => (
              <span key={outlet} className="chip chip-static">
                {outlet}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="section-title">Visit history</h2>
        <ul className="mt-2 space-y-2">
          {gym.visits.map((visit) => (
            <li key={visit.id} className="card px-3.5 py-3">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold leading-tight">
                      {formatStampDate(visit.visited_on)}
                    </p>
                    <span className="pill-tag">
                      <GradeLabel
                        system={visit.grade_system}
                        grade={visit.highest_grade}
                        vEquiv={visit.v_equiv}
                      />
                    </span>
                  </div>
                  <p className="mt-1 break-words text-[0.82rem] text-ink-soft">
                    {formatVisitPlace(visit)} · {formatClimbingType(visit.climbing_type)}
                  </p>
                  {visit.notes ? (
                    <p className="mt-1.5 break-words text-[0.82rem] leading-relaxed text-ink-soft">
                      “{visit.notes}”
                    </p>
                  ) : null}
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
        className="btn btn-soft"
      >
        <PlusIcon />
        Log another visit
      </button>
    </div>
  );
}
