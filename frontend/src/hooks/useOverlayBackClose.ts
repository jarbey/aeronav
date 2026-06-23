import { useEffect, useRef } from 'react';

/**
 * Makes the browser "Back" button (and Android hardware back) dismiss an open
 * overlay (modal, drawer, popover, menu) instead of navigating the page away.
 *
 * While `overlayOpen` is true a sentinel history entry is pushed. Pressing Back
 * pops that entry and triggers `closeAll()` rather than a page navigation. If the
 * overlay is instead closed from its own UI, the sentinel entry is consumed so the
 * history stays balanced.
 *
 * The sentinel keeps the SAME URL, so react-router sees no path change on the pop
 * and never navigates the underlying page.
 */
export function useOverlayBackClose(overlayOpen: boolean, closeAll: () => void): void {
  const closeRef = useRef(closeAll);
  closeRef.current = closeAll;

  useEffect(() => {
    if (!overlayOpen) return;

    // Preserve react-router's own history.state bookkeeping and add our marker.
    window.history.pushState({ ...window.history.state, __aeronavOverlay: true }, '');

    let consumedByBack = false;
    const onPopState = () => {
      consumedByBack = true;
      closeRef.current();
    };
    window.addEventListener('popstate', onPopState);

    return () => {
      window.removeEventListener('popstate', onPopState);
      // Overlay closed from its own UI (not via Back) → drop the sentinel entry.
      if (!consumedByBack && (window.history.state as { __aeronavOverlay?: boolean } | null)?.__aeronavOverlay) {
        window.history.back();
      }
    };
  }, [overlayOpen]);
}
