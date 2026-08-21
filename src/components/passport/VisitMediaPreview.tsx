"use client";

import { visitMediaLinkFromStored } from "@/lib/visitMedia";
import { VisitMediaEmbed } from "./VisitMediaEmbed";

export function VisitMediaPreview({
  videoPath,
  className,
}: {
  videoPath?: string | null;
  className?: string;
}) {
  const link = visitMediaLinkFromStored(videoPath);
  if (!link) return null;
  return <VisitMediaEmbed link={link} className={className} />;
}
