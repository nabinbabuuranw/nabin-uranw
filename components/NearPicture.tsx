"use client";
import { useEffect, useRef, useState } from "react";

// Native lazy-loading fetches images ~1250–2500 px early, which on a slow phone
// competes with the hero for bandwidth. This mounts the <picture> only when it is
// within ~400 px of the viewport. The square box is always reserved (no layout shift).
export function NearPicture({ name, alt, sizes }: { name: string; alt: string; sizes: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) { setNear(true); return; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setNear(true); io.disconnect(); } }, { rootMargin: "400px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const set = (ext: string) => [400, 640, 960].map((w) => `/img/${name}-${w}.${ext} ${w}w`).join(", ");
  const img = <img src={`/img/${name}-640.webp`} srcSet={set("webp")} sizes={sizes} width={640} height={640} loading="lazy" decoding="async" alt={alt} className="aspect-square h-auto w-full object-cover" />;
  return (
    <div ref={ref} className="aspect-square w-full">
      {near ? (
        <picture>
          <source type="image/avif" srcSet={set("avif")} sizes={sizes} />
          {img}
        </picture>
      ) : (
        <noscript>{img}</noscript>
      )}
    </div>
  );
}
