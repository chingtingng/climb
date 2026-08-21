"use client";

import { useEffect } from "react";
import {
  isIosDevice,
  lockIosViewportZoom,
  restoreIosViewportZoom,
  unlockIosViewportZoom,
} from "@/lib/iosViewportZoom";

function isSearchField(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest("[data-prevent-ios-zoom]"));
}

function searchStillFocused() {
  return isSearchField(document.activeElement);
}

/** Stops iPhone Safari zooming in when a search field is focused. */
export function IosSearchZoomGuard() {
  useEffect(() => {
    if (!isIosDevice()) return;

    function onTouchStart(event: TouchEvent) {
      if (isSearchField(event.target)) lockIosViewportZoom();
    }

    function onTouchEnd(event: TouchEvent) {
      if (isSearchField(event.target)) unlockIosViewportZoom(searchStillFocused);
    }

    function onFocusIn(event: FocusEvent) {
      if (isSearchField(event.target)) lockIosViewportZoom();
    }

    function onFocusOut(event: FocusEvent) {
      if (isSearchField(event.target)) unlockIosViewportZoom(searchStillFocused);
    }

    document.addEventListener("touchstart", onTouchStart, { capture: true, passive: true });
    document.addEventListener("touchend", onTouchEnd, { capture: true, passive: true });
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);

    return () => {
      document.removeEventListener("touchstart", onTouchStart, true);
      document.removeEventListener("touchend", onTouchEnd, true);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      restoreIosViewportZoom();
    };
  }, []);

  return null;
}
