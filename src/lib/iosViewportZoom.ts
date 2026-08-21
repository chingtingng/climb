/** iOS Safari zooms focused inputs under 16px. Temporarily cap scale instead of changing type. */

let applied = false;
let originalContent: string | null = null;
let restoreTimer = 0;

function viewportMeta() {
  return document.querySelector('meta[name="viewport"]');
}

export function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return true;
  // iPadOS 13+ reports as Macintosh.
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

export function lockIosViewportZoom() {
  if (!isIosDevice()) return;
  const meta = viewportMeta();
  if (!meta) return;

  window.clearTimeout(restoreTimer);
  restoreTimer = 0;

  if (applied) return;

  originalContent = meta.getAttribute("content") ?? "";
  if (!/maximum-scale/i.test(originalContent)) {
    meta.setAttribute("content", `${originalContent}, maximum-scale=1`);
  } else {
    meta.setAttribute(
      "content",
      originalContent.replace(/maximum-scale\s*=\s*[^,\s]+/i, "maximum-scale=1"),
    );
  }
  applied = true;
}

export function unlockIosViewportZoom(keepLocked?: () => boolean) {
  if (!isIosDevice()) return;
  window.clearTimeout(restoreTimer);
  restoreTimer = window.setTimeout(() => {
    if (keepLocked?.()) return;
    restoreIosViewportZoom();
  }, 300);
}

export function restoreIosViewportZoom() {
  window.clearTimeout(restoreTimer);
  restoreTimer = 0;
  const meta = viewportMeta();
  if (meta && originalContent != null) {
    meta.setAttribute("content", originalContent);
  }
  originalContent = null;
  applied = false;
}
