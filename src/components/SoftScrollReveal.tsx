"use client";

import { useEffect } from "react";

const HIDE_MS = 800;

/** Shows the thin scrollbar while a region is scrolling, then hides it. */
export function SoftScrollReveal() {
  useEffect(() => {
    const timers = new Map<Element, number>();

    function onScroll(event: Event) {
      const target = event.target;
      const el =
        target === document || target === document.documentElement
          ? document.documentElement
          : target instanceof Element
            ? target
            : null;
      if (!el) return;

      el.classList.add("is-scrolling");
      const prev = timers.get(el);
      if (prev) window.clearTimeout(prev);
      timers.set(
        el,
        window.setTimeout(() => {
          el.classList.remove("is-scrolling");
          timers.delete(el);
        }, HIDE_MS),
      );
    }

    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener("scroll", onScroll, true);
      for (const id of timers.values()) window.clearTimeout(id);
    };
  }, []);

  return null;
}
