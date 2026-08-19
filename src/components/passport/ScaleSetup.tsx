"use client";

import { useState } from "react";
import {
  COLOR_GRADES,
  GRADE_SYSTEMS,
  isHouseSystem,
  normalizeBandVRange,
  STANDARD_SYSTEMS,
  V_GRADES,
} from "@/lib/grades";
import { defaultScaleFor } from "@/lib/gymCatalog";
import type { GradeBand, GradeScale, GradeSystem } from "@/lib/types";

export function ScaleSetup({
  scale,
  chartFile,
  onChange,
  onChart,
}: {
  scale: GradeScale;
  chartFile: File | null;
  onChange: (scale: GradeScale) => void;
  onChart: (file: File | null) => void;
}) {
  const [from, setFrom] = useState(firstNumber(scale) ?? 1);
  const [to, setTo] = useState(lastNumber(scale) ?? 12);
  const [customLabel, setCustomLabel] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

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

  function removeBand(index: number) {
    onChange({
      ...scale,
      bands: scale.bands.filter((_, i) => i !== index),
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-pass-muted">
        You’re the first to add this place. Save how it grades so the next visit can reuse it.
      </p>

      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">How does this place grade?</legend>
        <div className="grid grid-cols-3 gap-2">
          {GRADE_SYSTEMS.map((item) => {
            const selected = item.value === scale.kind;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setKind(item.value)}
                className={`min-h-11 rounded-full border text-sm font-semibold ${
                  selected
                    ? "border-pass-primary bg-[#e7f4fb] text-pass-navy"
                    : "border-pass-line bg-white text-pass-muted"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {scale.kind === "number" ? (
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">From</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={99}
              value={from}
              onChange={(e) => applyRange(Number(e.target.value || 0), to)}
              className="passport-field"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">To</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={99}
              value={to}
              onChange={(e) => applyRange(from, Number(e.target.value || 0))}
              className="passport-field"
            />
          </label>
          <p className="col-span-2 text-xs text-pass-muted">
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
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    if (selected) {
                      onChange({
                        ...scale,
                        bands: scale.bands.filter((band) => band.label !== item.label),
                      });
                      return;
                    }
                    onChange({
                      ...scale,
                      bands: [
                        ...scale.bands,
                        {
                          label: item.label,
                          color: item.color,
                          v_equiv: `V${scale.bands.length + 1}`,
                        },
                      ],
                    });
                  }}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm font-semibold ${
                    selected ? "border-pass-primary bg-[#e7f4fb]" : "border-pass-line bg-white"
                  }`}
                >
                  <span
                    className="size-4 rounded-full border border-black/10"
                    style={{ background: item.color }}
                    aria-hidden
                  />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {scale.kind === "custom" ? (
        <div>
          <p className="mb-1.5 text-sm font-semibold">Grade labels, easy to hard</p>
          <div className="flex gap-2">
            <input
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
              }}
              placeholder="7Q"
              className="passport-field"
            />
            <button
              type="button"
              onClick={addCustom}
              className="min-h-12 shrink-0 rounded-full bg-pass-soft px-4 text-sm font-semibold"
            >
              Add
            </button>
          </div>
          <p className="mt-1.5 text-xs text-pass-muted">
            One row per chart band — any label works (“7Q”, “Alien Tags”).
          </p>
        </div>
      ) : null}

      {isHouseSystem(scale.kind) && scale.bands.length > 0 ? (
        <div>
          <p className="mb-1.5 text-sm font-semibold">Map to V-scale</p>
          <p className="mb-2 text-xs text-pass-muted">
            Set From and To the same for a single grade, or different for a range (V3–V4).
          </p>
          <ul className="space-y-1.5">
            {scale.bands.map((band, index) => {
              const min = band.v_equiv ?? "";
              const max = band.v_max ?? band.v_equiv ?? "";
              return (
                <li
                  key={`${band.label}-${index}`}
                  className="flex min-h-11 flex-wrap items-center gap-2 rounded-2xl border border-pass-line bg-white px-3 py-2"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{band.label}</span>
                  <div className="flex items-center gap-1.5">
                    <label className="sr-only" htmlFor={`v-min-${index}`}>
                      V-scale from for {band.label}
                    </label>
                    <select
                      id={`v-min-${index}`}
                      value={min}
                      onChange={(e) => {
                        const nextMin = e.target.value;
                        const nextMax = max && max !== min ? max : nextMin;
                        setBandV(index, nextMin, nextMax);
                      }}
                      className="min-h-10 min-w-[4.5rem] rounded-full border border-pass-line bg-pass-soft px-2 text-sm font-semibold text-pass-navy"
                    >
                      <option value="">Skip</option>
                      {V_GRADES.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                    <span className="text-xs font-semibold text-pass-muted" aria-hidden>
                      –
                    </span>
                    <label className="sr-only" htmlFor={`v-max-${index}`}>
                      V-scale to for {band.label}
                    </label>
                    <select
                      id={`v-max-${index}`}
                      value={max}
                      disabled={!min}
                      onChange={(e) => setBandV(index, min, e.target.value)}
                      className="min-h-10 min-w-[4.5rem] rounded-full border border-pass-line bg-pass-soft px-2 text-sm font-semibold text-pass-navy disabled:opacity-40"
                    >
                      <option value="">Skip</option>
                      {V_GRADES.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                    {scale.kind === "custom" ? (
                      <button
                        type="button"
                        onClick={() => removeBand(index)}
                        className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-pass-muted hover:bg-pass-soft hover:text-pass-navy"
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

      {isHouseSystem(scale.kind) ? (
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">
            Photo of the grade chart{" "}
            <span className="font-medium text-pass-muted">(optional)</span>
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              onChart(file);
              if (preview) URL.revokeObjectURL(preview);
              setPreview(file ? URL.createObjectURL(file) : null);
            }}
            className="block w-full text-sm text-pass-muted file:mr-3 file:min-h-11 file:rounded-full file:border-0 file:bg-pass-soft file:px-4 file:font-semibold file:text-pass-navy"
          />
          <span className="mt-1.5 block text-xs text-pass-muted">
            Optional — a photo helps the next visit reuse this place’s scale.
          </span>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Grade chart preview"
              className="mt-3 max-h-40 w-full rounded-2xl object-cover"
            />
          ) : chartFile ? (
            <p className="mt-2 text-sm text-pass-navy">{chartFile.name}</p>
          ) : null}
        </label>
      ) : (
        <p className="text-sm text-pass-muted">
          {STANDARD_SYSTEMS.includes(scale.kind)
            ? "Standard V-scale, Font, and French don’t need a chart photo."
            : "This grade system doesn’t need a chart photo."}
        </p>
      )}
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
