/** Client-side media helpers — keep uploads near 1080p for Supabase free-tier space. */

export const MAX_PHOTO_BYTES = 6 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 40 * 1024 * 1024;
export const MAX_VIDEO_SECONDS = 60;
export const TARGET_MAX_EDGE = 1080;

/** Metadata probe should fail fast — some mobile codecs never fire loadedmetadata. */
const VIDEO_META_TIMEOUT_MS = 8_000;

export type PreparedVisitMedia = {
  photo: File | null;
  video: File | null;
  photoWasCompressed: boolean;
  videoWasCompressed: boolean;
};

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Couldn't read that photo."));
    };
    img.src = url;
  });
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("Couldn't compress that photo."));
        else resolve(blob);
      },
      "image/jpeg",
      quality,
    );
  });
}

/** Downscale photos so the longest edge is at most 1080px. */
export async function compressPhotoTo1080p(file: File): Promise<{ file: File; compressed: boolean }> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose a photo (JPEG, PNG, or WebP).");
  }
  if (file.size === 0) throw new Error("That photo looks empty.");
  if (file.size > MAX_PHOTO_BYTES * 2) {
    throw new Error("Please keep photos under about 12 MB before compress.");
  }

  const img = await loadImage(file);
  const maxEdge = Math.max(img.naturalWidth, img.naturalHeight);
  const needsResize = maxEdge > TARGET_MAX_EDGE;
  const needsReencode =
    needsResize || file.size > MAX_PHOTO_BYTES || !/^image\/(jpeg|jpg|webp)$/i.test(file.type);

  if (!needsReencode) {
    return { file, compressed: false };
  }

  const scale = needsResize ? TARGET_MAX_EDGE / maxEdge : 1;
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't compress that photo.");
  ctx.drawImage(img, 0, 0, width, height);

  let quality = 0.82;
  let blob = await canvasToJpeg(canvas, quality);
  while (blob.size > MAX_PHOTO_BYTES && quality > 0.45) {
    quality -= 0.1;
    blob = await canvasToJpeg(canvas, quality);
  }
  if (blob.size > MAX_PHOTO_BYTES) {
    throw new Error("That photo is still too large after compress. Try a simpler shot.");
  }

  const next = new File([blob], renameExt(file.name, "jpg"), {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
  return { file: next, compressed: true };
}

function renameExt(name: string, ext: string): string {
  const base = name.replace(/\.[^.]+$/, "") || "visit";
  return `${base}.${ext}`;
}

type VideoMeta = {
  duration: number;
  videoWidth: number;
  videoHeight: number;
};

function loadVideoMeta(file: File): Promise<VideoMeta> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      video.onloadedmetadata = null;
      video.onerror = null;
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
      fn();
    };

    const timer = setTimeout(() => {
      finish(() =>
        reject(
          new Error(
            "That video took too long to check. Try a shorter clip under 1 minute, exported at 1080p.",
          ),
        ),
      );
    }, VIDEO_META_TIMEOUT_MS);

    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      finish(() =>
        resolve({
          duration,
          videoWidth: video.videoWidth || 0,
          videoHeight: video.videoHeight || 0,
        }),
      );
    };
    video.onerror = () => {
      finish(() => reject(new Error("Couldn't read that video.")));
    };
    video.src = url;
    // Safari sometimes needs an explicit load after setting src.
    try {
      video.load();
    } catch {
      // Ignore — onloadedmetadata / onerror still drive the promise.
    }
  });
}

function pickRecorderMime(): string | undefined {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return undefined;
}

function waitForVideoData(video: HTMLVideoElement, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (video.readyState >= 2) {
      resolve();
      return;
    }
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      video.onloadeddata = null;
      video.onerror = null;
      fn();
    };
    const timer = setTimeout(() => {
      finish(() => reject(new Error("Couldn't read that video.")));
    }, timeoutMs);
    video.onloadeddata = () => finish(() => resolve());
    video.onerror = () => finish(() => reject(new Error("Couldn't read that video.")));
  });
}

/**
 * Cap duration at 60s. Prefer accepting videos already under the size cap —
 * canvas re-encode is realtime and feels stuck on phones. Only re-encode when
 * the file is oversized (and the browser can MediaRecorder-compress).
 */
export async function compressVideoTo1080p(
  file: File,
  onProgress?: (ratio: number) => void,
): Promise<{ file: File; compressed: boolean }> {
  if (!file.type.startsWith("video/")) {
    throw new Error("Please choose a video file.");
  }
  if (file.size === 0) throw new Error("That video looks empty.");
  if (file.size > MAX_VIDEO_BYTES * 2.5) {
    throw new Error("Please keep videos under about 100 MB before compress.");
  }

  const probe = await loadVideoMeta(file);
  const duration = probe.duration;
  if (duration > MAX_VIDEO_SECONDS + 0.4) {
    throw new Error("Videos need to be under 1 minute.");
  }

  const maxEdge = Math.max(probe.videoWidth, probe.videoHeight);
  const withinSize = file.size <= MAX_VIDEO_BYTES;

  // Fast path: duration OK and already small enough for storage — skip re-encode.
  // (Resolution alone isn't worth a full realtime canvas pass on mobile.)
  if (withinSize) {
    onProgress?.(1);
    return { file, compressed: false };
  }

  if (maxEdge <= 0) {
    throw new Error("That video is too large. Export at 1080p and try again.");
  }

  const mime = pickRecorderMime();
  if (!mime || typeof MediaRecorder === "undefined") {
    throw new Error(
      "This browser can't compress video. Export at 1080p (under ~40 MB) and try again.",
    );
  }

  onProgress?.(0.02);

  const scale = Math.min(1, TARGET_MAX_EDGE / maxEdge);
  const width = Math.max(2, Math.round((probe.videoWidth * scale) / 2) * 2);
  const height = Math.max(2, Math.round((probe.videoHeight * scale) / 2) * 2);

  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  try {
    video.load();
  } catch {
    // optional
  }

  try {
    await waitForVideoData(video, VIDEO_META_TIMEOUT_MS);
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    URL.revokeObjectURL(url);
    throw new Error("Couldn't compress that video.");
  }

  const fps = 30;
  const canvasStream = canvas.captureStream(fps);
  let recordStream: MediaStream = canvasStream;
  try {
    const media = (video as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream?.();
    const audioTracks = media?.getAudioTracks() ?? [];
    if (audioTracks.length > 0) {
      recordStream = new MediaStream([...canvasStream.getVideoTracks(), ...audioTracks]);
    }
  } catch {
    // Audio optional — still save the picture track.
  }

  const recorder = new MediaRecorder(recordStream, {
    mimeType: mime,
    videoBitsPerSecond: 2_500_000,
  });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  const done = new Promise<Blob>((resolve, reject) => {
    recorder.onerror = () => reject(new Error("Couldn't compress that video."));
    recorder.onstop = () => resolve(new Blob(chunks, { type: mime.split(";")[0] }));
  });

  const playBudgetMs =
    (duration > 0 ? duration * 1000 : MAX_VIDEO_SECONDS * 1000) + 15_000;

  recorder.start(250);
  video.currentTime = 0;
  try {
    await video.play();
  } catch {
    if (recorder.state !== "inactive") recorder.stop();
    recordStream.getTracks().forEach((track) => track.stop());
    URL.revokeObjectURL(url);
    throw new Error("Couldn't compress that video.");
  }

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      video.onended = null;
      video.onerror = null;
      fn();
    };
    const timer = setTimeout(() => {
      try {
        video.pause();
      } catch {
        // ignore
      }
      finish(() =>
        reject(
          new Error(
            "Video compress timed out. Export at 1080p under ~40 MB and try again.",
          ),
        ),
      );
    }, playBudgetMs);

    const draw = () => {
      if (settled) return;
      if (video.ended) {
        finish(() => resolve());
        return;
      }
      // Don't treat a brief buffer pause as done — wait for ended / timeout.
      if (!video.paused) {
        ctx.drawImage(video, 0, 0, width, height);
        if (duration > 0) onProgress?.(Math.min(0.99, video.currentTime / duration));
      }
      requestAnimationFrame(draw);
    };
    video.onended = () => finish(() => resolve());
    video.onerror = () => finish(() => reject(new Error("Couldn't compress that video.")));
    draw();
  });

  // Final frame + stop
  ctx.drawImage(video, 0, 0, width, height);
  if (recorder.state !== "inactive") recorder.stop();
  recordStream.getTracks().forEach((track) => track.stop());
  URL.revokeObjectURL(url);

  const blob = await done;
  onProgress?.(1);
  if (blob.size === 0) throw new Error("Couldn't compress that video.");
  if (blob.size > MAX_VIDEO_BYTES) {
    throw new Error(
      "Compressed video is still large. Export at 1080p yourself and try a shorter clip.",
    );
  }

  const ext = mime.includes("mp4") ? "mp4" : "webm";
  const next = new File([blob], renameExt(file.name, ext), {
    type: blob.type || mime.split(";")[0],
    lastModified: Date.now(),
  });
  return { file: next, compressed: true };
}
