"use client";
import { useEffect } from "react";
import { MotionConfig } from "framer-motion";
// Marks the page as hydrated. The CSS fail-safe in globals.css only reveals hidden sections when this never happens.
export function Motion({ children }: { children: React.ReactNode }) {
  useEffect(() => { if ("IntersectionObserver" in window) document.documentElement.classList.add("hydrated"); }, []);
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
