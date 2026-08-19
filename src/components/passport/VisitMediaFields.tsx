"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  compressPhotoTo1080p,
  compressVideoTo1080p,
  MAX_VIDEO_SECONDS,
} from "@/lib/mediaCompress";

export const VISIT_MEDIA_BUCKET = "visit-media";

export async function uploadVisitMediaFile(
  kind: "photo" | "video",
  file: File,
): Promise<string> {
  const supabase = createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    throw new Error("Please sign in again to upload media.");
  }
  const profileId = auth.user.id;
  const ext = (file.name.split(".").pop() || (kind === "photo" ? "jpg" : "webm")).toLowerCase();
  const path = `${profileId}/${crypto.randomUUID()}/${kind}.${ext}`;
  const { error } = await supabase.storage.from(VISIT_MEDIA_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || (kind === "photo" ? "image/jpeg" : "video/webm"),
  });
  if (error) {
    throw new Error(
      "Couldn't upload visit media. Run supabase/visit-media.sql in the Supabase SQL Editor, then try again.",
    );
  }
  return path;
}

type Props = {
  photo: File | null;
  video: File | null;
  onPhoto: (file: File | null) => void;
  onVideo: (file: File | null) => void;
  busy?: boolean;
};

function useObjectUrl(file: File | null): string | null {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    if (!url) return;
    return () => URL.revokeObjectURL(url);
  }, [url]);
  return url;
}

export function VisitMediaFields({ photo, video, onPhoto, onVideo, busy }: Props) {
  const photoPreview = useObjectUrl(photo);
  const videoPreview = useObjectUrl(video);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  async function handlePhoto(file: File | null) {
    setError(null);
    setStatus(null);
    if (!file) {
      onPhoto(null);
      return;
    }
    try {
      setStatus("Preparing photo…");
      const result = await compressPhotoTo1080p(file);
      onPhoto(result.file);
      setStatus(
        result.compressed
          ? "Photo resized to 1080p to save storage space."
          : "Photo ready (already within 1080p).",
      );
    } catch (err) {
      onPhoto(null);
      setError(err instanceof Error ? err.message : "Couldn't use that photo.");
      setStatus(null);
    }
  }

  async function handleVideo(file: File | null) {
    setError(null);
    setStatus(null);
    setProgress(null);
    if (!file) {
      onVideo(null);
      return;
    }
    try {
      setStatus("Checking video…");
      const result = await compressVideoTo1080p(file, (ratio) => {
        setProgress(ratio);
        setStatus(`Compressing video to 1080p… ${Math.round(ratio * 100)}%`);
      });
      onVideo(result.file);
      setProgress(null);
      setStatus(
        result.compressed
          ? "Video compressed to 1080p — quality may be a bit lower than 2K/4K."
          : "Video ready (already within 1080p / size limits).",
      );
    } catch (err) {
      onVideo(null);
      setProgress(null);
      setError(err instanceof Error ? err.message : "Couldn't use that video.");
      setStatus(null);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold">Media (optional)</p>
        <p className="mt-1 text-xs leading-relaxed text-pass-muted">
          Up to 1 photo and 1 video (under {MAX_VIDEO_SECONDS}s). Prefer 1080p — we’ll compress
          higher resolutions so Supabase storage stays lean (quality may drop).
        </p>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">
          Photo <span className="font-medium text-pass-muted">(optional)</span>
        </span>
        <input
          type="file"
          accept="image/*"
          disabled={busy}
          onChange={(e) => {
            void handlePhoto(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
          className="block w-full text-sm text-pass-muted file:mr-3 file:min-h-11 file:rounded-full file:border-0 file:bg-pass-soft file:px-4 file:font-semibold file:text-pass-navy"
        />
        {photoPreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoPreview}
            alt="Visit photo preview"
            className="mt-3 max-h-40 w-full rounded-2xl object-cover"
          />
        ) : null}
        {photo ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onPhoto(null)}
            className="mt-2 text-xs font-semibold text-pass-primary"
          >
            Remove photo
          </button>
        ) : null}
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">
          Video <span className="font-medium text-pass-muted">(optional, &lt;1 min)</span>
        </span>
        <input
          type="file"
          accept="video/*"
          disabled={busy}
          onChange={(e) => {
            void handleVideo(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
          className="block w-full text-sm text-pass-muted file:mr-3 file:min-h-11 file:rounded-full file:border-0 file:bg-pass-soft file:px-4 file:font-semibold file:text-pass-navy"
        />
        {videoPreview ? (
          <video
            src={videoPreview}
            controls
            className="mt-3 max-h-48 w-full rounded-2xl bg-black object-contain"
          />
        ) : null}
        {video ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onVideo(null)}
            className="mt-2 text-xs font-semibold text-pass-primary"
          >
            Remove video
          </button>
        ) : null}
      </label>

      {progress != null ? (
        <div className="h-1.5 overflow-hidden rounded-full bg-pass-line">
          <div
            className="h-full rounded-full bg-pass-primary transition-[width]"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      ) : null}
      {status ? <p className="text-xs text-pass-muted">{status}</p> : null}
      {error ? (
        <p role="alert" className="text-xs font-medium text-[#8a2f2f]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
