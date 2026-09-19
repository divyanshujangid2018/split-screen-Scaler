import { useCallback, useEffect, useRef, useState } from "react";

function isTypingTarget(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || (el as HTMLElement).isContentEditable;
}

export function useHorizontalScrollNav(columnWidth: number) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollLeft, setScrollLeft] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => setScrollLeft(el.scrollLeft);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const scrollByColumns = useCallback((n: number) => {
    containerRef.current?.scrollBy({ left: n * columnWidth, behavior: "smooth" });
  }, [columnWidth]);

  const scrollToStart = useCallback(() => {
    containerRef.current?.scrollTo({ left: 0, behavior: "smooth" });
  }, []);

  const scrollToEnd = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(document.activeElement)) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") return; // handled by search shortcut
      switch (e.key) {
        case "ArrowRight":
          scrollByColumns(1);
          e.preventDefault();
          break;
        case "ArrowLeft":
          scrollByColumns(-1);
          e.preventDefault();
          break;
        case "Home":
          scrollToStart();
          e.preventDefault();
          break;
        case "End":
          scrollToEnd();
          e.preventDefault();
          break;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [scrollByColumns, scrollToStart, scrollToEnd]);

  const firstVisibleIndex = Math.round(scrollLeft / columnWidth);

  return { containerRef, scrollByColumns, scrollToStart, scrollToEnd, firstVisibleIndex };
}
