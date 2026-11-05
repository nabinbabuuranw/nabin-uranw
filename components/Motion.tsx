"use client";
import { useEffect } from "react";
import { MotionConfig } from "framer-motion";
// Marks the page as hydrated (the CSS fail-safe in globals.css only applies when this never happens) and applies
// light content protection. Protection is deterrence only: anything a browser displays can still be saved by a
// determined visitor. Form fields, links and keyboard use are left alone so accessibility and forms keep working.
export function Motion({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if ("IntersectionObserver" in window) document.documentElement.classList.add("hydrated");
    const editable = (t: EventTarget | null) => !!(t instanceof Element) && !!t.closest("input, textarea, select, [contenteditable=''], [contenteditable='true'], a[href]");
    const media = (t: EventTarget | null) => !!(t instanceof Element) && !!t.closest("img, video, picture, canvas, svg");
    const onMenu = (e: MouseEvent) => { if (media(e.target) || !editable(e.target)) e.preventDefault(); };
    const onDrag = (e: DragEvent) => { if (e.target instanceof Element && e.target.closest("img, video, picture, svg, canvas")) e.preventDefault(); };
    document.addEventListener("contextmenu", onMenu);
    document.addEventListener("dragstart", onDrag);
    return () => { document.removeEventListener("contextmenu", onMenu); document.removeEventListener("dragstart", onDrag); };
  }, []);
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
