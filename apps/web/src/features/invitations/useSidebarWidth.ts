import { useCallback, useState } from 'react';

export const SIDEBAR_DEFAULT = 400;
export const SIDEBAR_MIN = 320;
export const SIDEBAR_MAX = 720;
const KEY = 'editor.sidebarWidth';

const clamp = (value: number) => Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, Math.round(value)));

function read(): number {
  try {
    const stored = Number(window.localStorage.getItem(KEY));
    return stored ? clamp(stored) : SIDEBAR_DEFAULT;
  } catch {
    return SIDEBAR_DEFAULT;
  }
}

/** The editor sidebar's width in px on desktop. The customer can drag it wider; it is remembered. */
export function useSidebarWidth() {
  const [width, setWidthState] = useState(read);
  const setWidth = useCallback((value: number) => {
    const next = clamp(value);
    setWidthState(next);
    try {
      window.localStorage.setItem(KEY, String(next));
    } catch {
      // The width simply is not remembered.
    }
  }, []);
  return { width, setWidth, reset: () => setWidth(SIDEBAR_DEFAULT) };
}
