"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { VISIT_MEDIA_BUCKET } from "./VisitMediaFields";

export function VisitMediaPreview({
  photoPath,
  videoPath,
}: {
  photoPath?: string | null;
  videoPath?: string | null;
}) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!photoPath && !videoPath) {
        setPhotoUrl(null);
        setVideoUrl(null);
        return;
      }
      const supabase = createClient();
      if (photoPath) {
        const { data } = await supabase.storage
          .from(VISIT_MEDIA_BUCKET)
          .createSignedUrl(photoPath, 3600);
        if (!cancelled) setPhotoUrl(data?.signedUrl ?? null);
      } else if (!cancelled) {
        setPhotoUrl(null);
      }
      if (videoPath) {
        const { data } = await supabase.storage
          .from(VISIT_MEDIA_BUCKET)
          .createSignedUrl(videoPath, 3600);
        if (!cancelled) setVideoUrl(data?.signedUrl ?? null);
      } else if (!cancelled) {
        setVideoUrl(null);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [photoPath, videoPath]);

  if (!photoPath && !videoPath) return null;

  return (
    <div className="mt-2.5 space-y-2">
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt="Visit photo"
          className="max-h-48 w-full rounded-xl object-cover"
        />
      ) : null}
      {videoUrl ? (
        <video
          src={videoUrl}
          controls
          className="max-h-56 w-full rounded-xl bg-black object-contain"
        />
      ) : null}
    </div>
  );
}
