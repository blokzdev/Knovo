"use client";

import { useEffect, type RefObject } from "react";

// Behaviour for the in-page immersive overlay (CSS-promoted stage; see InteractiveStage).
// While active: lock body scroll, exit on Escape, move focus into the overlay and restore it on
// close. Radix Sheets used inside the overlay stop Escape propagation, so an open sheet closes
// first and the overlay stays put — exactly the expected nesting behaviour.
export function useImmersive({
  active,
  onExit,
  exitButtonRef,
  returnFocusRef,
}: {
  active: boolean;
  onExit: () => void;
  exitButtonRef: RefObject<HTMLElement>;
  returnFocusRef: RefObject<HTMLElement>;
}) {
  // Lock body scroll while immersive; restore the prior value on exit.
  useEffect(() => {
    if (!active) return;
    const body = document.body;
    const prev = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = prev;
    };
  }, [active]);

  // Escape exits; focus the exit button on open and restore focus to the trigger on close.
  useEffect(() => {
    if (!active) return;
    exitButtonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onExit();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      // Read the trigger fresh: it remounts when leaving immersive, so capturing it at setup
      // (when it is unmounted) would lose the reference. The "stale ref" lint rule is inverted here.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      returnFocusRef.current?.focus();
    };
    // exitButtonRef / returnFocusRef are stable refs; re-run only on active/onExit changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, onExit]);
}
