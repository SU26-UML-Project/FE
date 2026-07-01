import { useLayoutEffect, useRef, useState } from "react";
import { useEditor } from "../lib/editorContext";

/**
 * Measure the real content height of a node (independent of the node's own
 * height) by reading a content wrapper sized to its natural height. Returns 0
 * until measured. Re-measures on any content / width change via ResizeObserver.
 */
export function useContentHeight(
  ref: React.RefObject<HTMLElement | null>,
  deps: unknown[]
) {
  const [h, setH] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setH(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, ...deps]);
  return h;
}

/**
 * Hook: grow the node's HEIGHT so its content never gets clipped. Width is
 * left untouched — long text wraps instead of stretching the shape sideways.
 */
export function useAutoGrow(
  id: string,
  height: number | undefined,
  minH: number
) {
  const { growNode } = useEditor();
  useLayoutEffect(() => {
    if (height === undefined || minH <= 0) return;
    if (height < minH) growNode(id, 0, minH);
  }, [id, height, minH, growNode]);
}

/**
 * Tiny localStorage helper hook with JSON (de)serialisation + SSR safety.
 */
export function useLocalStorage<T>(key: string, initial: T) {
  const ref = useRef<T>(initial);
  useLayoutEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw != null) ref.current = JSON.parse(raw) as T;
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return ref;
}
