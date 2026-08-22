"use client";

import { useState } from "react";
import {
  COLOR_GRADES,
  colorHex,
  GRADE_SYSTEMS,
  isHouseSystem,
  normalizeBandVRange,
  V_GRADES,
} from "@/lib/grades";
import { defaultScaleFor } from "@/lib/gymCatalog";
import type { GradeBand, GradeScale, GradeSystem } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { ChoiceTile } from "@/components/ui/ChoiceTile";
import { Field } from "@/components/ui/Field";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { cx } from "@/components/ui/cx";

export function ScaleSetup({
  scale,
  onChange,
  intro = "You’re the first to add this place. Save how it grades so the next visit can reuse it.",
}: {
  scale: GradeScale;
  onChange: (scale: GradeScale) => void;
  intro?: string;
}) {
  const [from, setFrom] = useState(firstNumber(scale) ?? 1);
  const [to, setTo] = useState(lastNumber(scale) ?? 12);
  const [customLabel, setCustomLabel] = useState("");
  const [customColorLabel, setCustomColorLabel] = useState("");
  const [customColorHex, setCustomColorHex] = useState("#14b8a6");

  function setKind(kind: GradeSystem) {
    if (kind === "number") {
      onChange(defaultScaleFor("number", from, to));
      return;
    }
    onChange(defaultScaleFor(kind));
  }

  function applyRange(nextFrom: number, nextTo: number) {
    setFrom(nextFrom);
    setTo(nextTo);
    onChange(defaultScaleFor("number", nextFrom, nextTo));
  }

  function updateBand(index: number, patch: Partial<GradeBand>) {
    onChange({
      ...scale,
      bands: scale.bands.map((band, i) => (i === index ? { ...band, ...patch } : band)),
    });
  }

  function setBandV(index: number, nextMin: string, nextMax: string) {
    const range = normalizeBandVRange(nextMin || undefined, nextMax || undefined);
    updateBand(index, {
      v_equiv: range.v_equiv,
      v_max: range.v_max,
    });
  }

  function addCustom() {
    const label = customLabel.trim();
    if (!label) return;
    onChange({
      ...scale,
      bands: [
        ...scale.bands,
        { label, v_equiv: `V${Math.min(16, scale.bands.length + 1)}` },
      ],
    });
    setCustomLabel("");
  }

  function addCustomColor() {
    const label = customColorLabel.trim();
    if (!label) return;
    if (scale.bands.some((band) => band.label.toLowerCase() === label.toLowerCase())) {
      return;
    }
    onChange({
      ...scale,
      bands: [
        ...scale.bands,
        {
          label,
          color: customColorHex,
          v_equiv: `V${Math.min(16, scale.bands.length + 1)}`,
        },
      ],
    });
    setCustomColorLabel("");
  }

  function toggleColorBand(label: string, color: string) {
    const selected = scale.bands.some((band) => band.label === label);
    if (selected) {
      onChange({
        ...scale,
        bands: scale.bands.filter((band) => band.label !== label),
      });
      return;
    }
    onChange({
      ...scale,
      bands: [
        ...scale.bands,
        {
          label,
          color,
          v_equiv: `V${scale.bands.length + 1}`,
        },
      ],
    });
  }

  function removeBand(index: number) {
    onChange({
      ...scale,
      bands: scale.bands.filter((_, i) => i !== index),
    });
  }

  const showRemove = scale.kind === "custom";
  const numberRows = scale.kind === "number";
  const mappingGrid = cx(
    "grid items-center gap-x-2.5",
    numberRows && showRemove && "grid-cols-[1.75rem_minmax(0,1fr)_1.25rem_minmax(0,1fr)_2.25rem]",
    numberRows && !showRemove && "grid-cols-[1.75rem_minmax(0,1fr)_1.25rem_minmax(0,1fr)]",
    !numberRows && showRemove && "grid-cols-[minmax(2.5rem,4.75rem)_minmax(0,1fr)_1.25rem_minmax(0,1fr)_2.25rem]",
    !numberRows && !showRemove && "grid-cols-[minmax(2.5rem,4.75rem)_minmax(0,1fr)_1.25rem_minmax(0,1fr)]",
  );

  return (
    <div className="space-y-4">
      {intro ? (
        <p className="text-sm leading-relaxed text-ink-soft">{intro}</p>
      ) : null}

      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">Grade system</legend>
        <div className="grid grid-cols-3 gap-2">
          {GRADE_SYSTEMS.map((item) => (
            <Chip
              key={item.value}
              selected={item.value === scale.kind}
              onClick={() => setKind(item.value)}
              className="w-full justify-center"
            >
              {item.label}
            </Chip>
          ))}
        </div>
      </fieldset>

      {scale.kind === "number" ? (
        <div>
          <div className="flex items-end gap-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">From</span>
              <Field
                type="number"
                inputMode="numeric"
                min={0}
                max={99}
                value={from}
                onChange={(e) => applyRange(Number(e.target.value || 0), to)}
                className="!w-[5.75rem]"
              />
            </label>
            <span className="mb-2.5 text-sm font-medium text-ink-soft" aria-hidden>
              to
            </span>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">To</span>
              <Field
                type="number"
                inputMode="numeric"
                min={0}
                max={99}
                value={to}
                onChange={(e) => applyRange(from, Number(e.target.value || 0))}
                className="!w-[5.75rem]"
              />
            </label>
          </div>
          <p className="mt-1.5 text-xs text-ink-soft">
            Chart bands can map to a V range below (e.g. 7 and 8 both → V3–V4).
          </p>
        </div>
      ) : null}

      {scale.kind === "color" ? (
        <div>
          <p className="mb-1.5 text-sm font-semibold">Colours, easy to hard</p>
          <div className="flex flex-wrap gap-2">
            {COLOR_GRADES.map((item) => {
              const selected = scale.bands.some((band) => band.label === item.label);
              return (
                <ChoiceTile
                  key={item.label}
                  selected={selected}
                  onClick={() => toggleColorBand(item.label, item.color)}
                  className="inline-flex min-h-[var(--control-min)] items-center gap-2 rounded-full px-3 py-0 text-sm font-semibold"
                >
                  <span
                    className="size-4 rounded-full border border-ink/15"
                    style={{ background: item.color }}
                    aria-hidden
                  />
                  {item.label}
                </ChoiceTile>
              );
            })}
            {scale.bands
              .filter((band) => !COLOR_GRADES.some((item) => item.label === band.label))
              .map((band) => (
                <ChoiceTile
                  key={band.label}
                  selected
                  onClick={() => toggleColorBand(band.label, band.color ?? colorHex(band.label))}
                  className="inline-flex min-h-[var(--control-min)] items-center gap-2 rounded-full px-3 py-0 text-sm font-semibold"
                >
                  <span
                    className="size-4 rounded-full border border-ink/15"
                    style={{ background: band.color ?? colorHex(band.label) }}
                    aria-hidden
                  />
                  {band.label}
                </ChoiceTile>
              ))}
          </div>
          <div className="mt-3">
            <p className="mb-1.5 text-sm font-semibold">Add a colour</p>
            <div className="grid grid-cols-[minmax(0,4fr)_auto_minmax(0,1fr)] items-center gap-2">
              <Field
                value={customColorLabel}
                onChange={(e) => setCustomColorLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomColor();
                  }
                }}
                placeholder="Teal"
                className="min-w-0"
              />
              <input
                type="color"
                value={customColorHex}
                onChange={(e) => setCustomColorHex(e.target.value)}
                aria-label="Pick colour swatch"
                className="size-[var(--control-min)] shrink-0 cursor-pointer rounded-full border border-sky-300 bg-surface p-0.5"
              />
              <Button type="button" variant="secondary" onClick={addCustomColor} className="px-2">
                Add
              </Button>
            </div>
            <p className="mt-1.5 text-xs text-ink-soft">
              For house colours not in the list — pick a swatch that matches the gym.
            </p>
          </div>
        </div>
      ) : null}

      {scale.kind === "custom" ? (
        <div>
          <p className="mb-1.5 text-sm font-semibold">Grade labels, easy to hard</p>
          <div className="grid grid-cols-[4fr_1fr] gap-2">
            <Field
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
              }}
              placeholder="7Q"
              className="min-w-0"
            />
            <Button type="button" variant="secondary" onClick={addCustom} className="px-2">
              Add
            </Button>
          </div>
          <p className="mt-1.5 text-xs text-ink-soft">
            One row per chart band — any label works (“7Q”, “Alien Tags”).
          </p>
        </div>
      ) : null}

      {isHouseSystem(scale.kind) && scale.bands.length > 0 ? (
        <div>
          <p className="text-base font-semibold text-ink">Map to V-scale</p>
          <p className="mt-0.5 text-sm text-ink-soft">
            Choose a V-grade or range for each grade.
          </p>
          <p className="mt-2 inline-flex max-w-full rounded-full bg-sky-50 px-2.5 py-1 text-xs leading-snug text-ink-soft">
            Example: V3 → V4 = grades covering V3 through V4
          </p>

          <div className="mt-3">
            <div className={cx(mappingGrid, "pb-1")} aria-hidden>
              <span />
              <span className="label-micro text-center">From</span>
              <span />
              <span className="label-micro text-center">To</span>
              {showRemove ? <span /> : null}
            </div>
            <ul className="mt-1 divide-y divide-sky-100">
              {scale.bands.map((band, index) => {
                const min = band.v_equiv ?? "";
                const max = band.v_max ?? band.v_equiv ?? "";
                const vOptions = ["", ...V_GRADES];
                return (
                  <li key={`${band.label}-${index}`} className={cx(mappingGrid, "min-h-11 py-1.5")}>
                    <GradeRowLabel band={band} />
                    <SelectMenu
                      id={`v-min-${index}`}
                      value={min}
                      options={vOptions}
                      placeholder="Skip"
                      ariaLabel={`V-scale from for ${band.label}`}
                      className="!h-9 !min-h-9 !px-2 !text-[14px] [&_svg]:size-3.5"
                      onChange={(nextMin) => {
                        const nextMax = max && max !== min ? max : nextMin;
                        setBandV(index, nextMin, nextMax);
                      }}
                    />
                    <RangeArrow />
                    <SelectMenu
                      id={`v-max-${index}`}
                      value={max}
                      options={vOptions}
                      placeholder="Skip"
                      ariaLabel={`V-scale to for ${band.label}`}
                      disabled={!min}
                      className="!h-9 !min-h-9 !px-2 !text-[14px] [&_svg]:size-3.5"
                      onChange={(nextMax) => setBandV(index, min, nextMax)}
                    />
                    {showRemove ? (
                      <button
                        type="button"
                        onClick={() => removeBand(index)}
                        className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-sky-50 hover:text-ink"
                        aria-label={`Remove ${band.label}`}
                      >
                        <span aria-hidden className="text-lg leading-none">
                          ×
                        </span>
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function GradeRowLabel({ band }: { band: GradeBand }) {
  if (band.color) {
    return (
      <span className="flex min-w-0 items-center gap-1.5">
        <span
          className="size-2.5 shrink-0 rounded-full border border-ink/10"
          style={{ background: band.color }}
          aria-hidden
        />
        <span className="grade-text truncate text-sm text-ink">{band.label}</span>
      </span>
    );
  }

  return (
    <span className="grade-text w-full text-center text-sm tabular-nums text-ink">
      {band.label}
    </span>
  );
}

function RangeArrow() {
  return (
    <span className="flex items-center justify-center text-sky-600" aria-hidden>
      <svg viewBox="0 0 16 16" className="size-3.5" fill="none">
        <path
          d="M2.5 8h11M10 4.5 13.5 8 10 11.5"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function firstNumber(scale: GradeScale): number | null {
  if (scale.kind !== "number" || scale.bands.length === 0) return null;
  const n = Number.parseInt(scale.bands[0].label, 10);
  return Number.isFinite(n) ? n : null;
}

function lastNumber(scale: GradeScale): number | null {
  if (scale.kind !== "number" || scale.bands.length === 0) return null;
  const n = Number.parseInt(scale.bands[scale.bands.length - 1].label, 10);
  return Number.isFinite(n) ? n : null;
}
