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

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-ink-soft">{intro}</p>

      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">How does this place grade?</legend>
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
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">From</span>
            <Field
              type="number"
              inputMode="numeric"
              min={0}
              max={99}
              value={from}
              onChange={(e) => applyRange(Number(e.target.value || 0), to)}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">To</span>
            <Field
              type="number"
              inputMode="numeric"
              min={0}
              max={99}
              value={to}
              onChange={(e) => applyRange(from, Number(e.target.value || 0))}
            />
          </label>
          <p className="col-span-2 text-xs text-ink-soft">
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
          <p className="mb-1.5 text-sm font-semibold">Map to V-scale</p>
          <p className="mb-2 text-xs text-ink-soft">
            Set From and To the same for a single grade, or different for a range (V3–V4).
          </p>
          <ul className="space-y-1.5">
            {scale.bands.map((band, index) => {
              const min = band.v_equiv ?? "";
              const max = band.v_max ?? band.v_equiv ?? "";
              const vOptions = ["", ...V_GRADES];
              return (
                <li
                  key={`${band.label}-${index}`}
                  className="flex items-center gap-2 rounded-full border border-sky-300 bg-surface px-3 py-1"
                >
                  <span className="grade-text min-w-0 flex-1 truncate text-sm">{band.label}</span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <SelectMenu
                      id={`v-min-${index}`}
                      value={min}
                      options={vOptions}
                      placeholder="Skip"
                      ariaLabel={`V-scale from for ${band.label}`}
                      fullWidth={false}
                      className="!min-h-9 px-2.5 text-sm"
                      onChange={(nextMin) => {
                        const nextMax = max && max !== min ? max : nextMin;
                        setBandV(index, nextMin, nextMax);
                      }}
                    />
                    <span className="text-xs font-semibold text-ink-soft" aria-hidden>
                      –
                    </span>
                    <SelectMenu
                      id={`v-max-${index}`}
                      value={max}
                      options={vOptions}
                      placeholder="Skip"
                      ariaLabel={`V-scale to for ${band.label}`}
                      disabled={!min}
                      fullWidth={false}
                      className="!min-h-9 px-2.5 text-sm"
                      onChange={(nextMax) => setBandV(index, min, nextMax)}
                    />
                    {scale.kind === "custom" ? (
                      <button
                        type="button"
                        onClick={() => removeBand(index)}
                        className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-sky-100 hover:text-ink"
                        aria-label={`Remove ${band.label}`}
                      >
                        <span aria-hidden className="text-lg leading-none">
                          ×
                        </span>
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
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
