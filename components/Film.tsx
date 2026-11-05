"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";

// Brand film (64 s, code-rendered motion graphics, original score).
// Poster first: nothing but the poster loads until the film is near the viewport or the visitor presses play.
const MEDIA = process.env.NEXT_PUBLIC_MEDIA_BASE ?? ""; // GitHub Pages build loads the big video files from the main site
const FILM = {
  poster: "/film/nabin-brand-film-poster-1280.webp",
  desktop: [{ src: `${MEDIA}/__f/nabin-brand-film-1080p.mp4`, type: "video/mp4" }],
  mobile: [
    { src: `${MEDIA}/__f/nabin-brand-film-720p.webm`, type: 'video/webm; codecs="vp9,opus"' },
    { src: `${MEDIA}/__f/nabin-brand-film-720p.mp4`, type: "video/mp4" },
  ],
  duration: 64,
};

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function Film() {
  const wrap = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [time, setTime] = useState(0);
  const [started, setStarted] = useState(false);
  const userPaused = useRef(false);
  const seenOnce = useRef(false);
  const attempted = useRef(false);
  const reduced = useRef(false);

  // Pick the source for this screen: 720p on phones (or Save-Data), 1080p elsewhere.
  const load = useCallback(() => {
    const v = video.current;
    if (!v || v.dataset.loaded) return;
    const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
    const small = window.matchMedia("(max-width: 767px)").matches || !!nav.connection?.saveData;
    const list = small ? FILM.mobile : FILM.desktop;
    const pick = list.find((s) => v.canPlayType(s.type) !== "") ?? list[list.length - 1];
    v.src = pick.src;
    v.dataset.loaded = "1";
    setLoaded(true);
  }, []);

  const play = useCallback(async (fromUser: boolean) => {
    const v = video.current;
    if (!v) return;
    load();
    if (fromUser) userPaused.current = false;
    try { await v.play(); } catch { /* autoplay refused: the poster and play button stay */ }
  }, [load]);

  const toggle = useCallback(() => {
    const v = video.current;
    if (!v) return;
    if (v.paused || v.ended) { play(true); }
    else { userPaused.current = true; v.pause(); }
  }, [play]);

  const savePref = (on: boolean) => { try { localStorage.setItem("nb-film-sound", on ? "on" : "off"); } catch { /* storage blocked */ } };

  const toggleMute = useCallback(() => {
    const v = video.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    savePref(!v.muted);
    if (!v.muted && v.paused) play(true);
  }, [play]);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
    const el = wrap.current;
    if (!el || !("IntersectionObserver" in window)) return;
    // Near the viewport: fetch the metadata. Mostly in view: muted autoplay (never with reduced motion or Save-Data).
    const near = new IntersectionObserver(([e]) => { if (e.isIntersecting) { load(); near.disconnect(); } }, { rootMargin: "300px 0px" });
    const seen = new IntersectionObserver(([e]) => {
      const v = video.current;
      if (!v) return;
      if (e.isIntersecting && e.intersectionRatio >= 0.6) {
        seenOnce.current = true;
        if (!reduced.current && !nav.connection?.saveData && !userPaused.current && v.paused && !v.ended) { if (!v.muted && !attempted.current) return; play(false); }
      } else if (seenOnce.current && !v.paused) { v.pause(); }
    }, { threshold: [0, 0.6] });
    near.observe(el); seen.observe(el);

    // Audible autoplay is attempted once, on page load. Browsers usually refuse it without a prior tap: then the film
    // starts silent and the visible Unmute button stays on the player. The policy is never bypassed.
    const wantsSound = (() => { try { return localStorage.getItem("nb-film-sound") !== "off"; } catch { return true; } })();
    const attempt = async () => {
      const v = video.current;
      if (!v || attempted.current || reduced.current || nav.connection?.saveData) return;
      attempted.current = true;
      load();
      if (!wantsSound) { v.muted = true; setMuted(true); return; }
      v.muted = false; v.volume = 1; setMuted(false);
      try { await v.play(); }
      catch {
        v.muted = true; setMuted(true);
        try { await v.play(); } catch { /* even silent play refused: poster and play button stay */ }
      }
    };
    let idle = 0;
    const kick = () => { idle = window.setTimeout(attempt, 400); };
    if (document.readyState === "complete") kick(); else window.addEventListener("load", kick, { once: true });
    const onHide = () => { const v = video.current; if (document.hidden && v && !v.paused) v.pause(); };
    document.addEventListener("visibilitychange", onHide);
    return () => { near.disconnect(); seen.disconnect(); window.clearTimeout(idle); window.removeEventListener("load", kick); document.removeEventListener("visibilitychange", onHide); };
  }, [load, play]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === " " || e.key === "k" || e.key === "K") { e.preventDefault(); toggle(); }
    else if (e.key === "m" || e.key === "M") { e.preventDefault(); toggleMute(); }
  };

  const pct = Math.min(100, (time / FILM.duration) * 100);

  return (
    <section id="film" aria-labelledby="film-title" className="relative overflow-hidden bg-[#0E1311] text-mist">
      <div className="dotgrid-dark absolute inset-0" aria-hidden />
      <div className="shell relative py-16 md:py-24">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
          <div>
            <p className="font-mono text-[11.5px] uppercase tracking-[0.14em] text-sage/80 flex items-center gap-3"><span className="h-px w-8 bg-sage" aria-hidden />Film</p>
            <h2 id="film-title" className="mt-5 max-w-[20ch] font-display text-[clamp(1.9rem,4vw,3rem)] font-semibold leading-[1.02] tracking-tightest text-[#F2F4F2]">
              I Build Digital Experiences.
            </h2>
          </div>
          <p className="max-w-[44ch] text-[15.5px] leading-relaxed text-mist/70">
            A one-minute introduction: who I am, what I work with, and real projects captured from their live sites.
          </p>
        </div>

        <div
          ref={wrap}
          className="group relative mt-10 aspect-video w-full overflow-hidden rounded-[18px] bg-black shadow-[0_40px_90px_-40px_rgba(0,0,0,.8)] ring-1 ring-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
          tabIndex={0}
          role="region"
          aria-label="Brand film player. Space or K plays and pauses, M mutes."
          onKeyDown={onKey}
        >
          <video
            ref={video}
            className="absolute inset-0 h-full w-full object-cover"
            poster={FILM.poster}
            preload="none"
            controls
            controlsList="nodownload noremoteplayback"
            disablePictureInPicture
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            muted
            playsInline
            width={1920}
            height={1080}
            aria-describedby="film-desc"
            onPlay={() => { setPlaying(true); setStarted(true); }}
            onPause={() => setPlaying(false)}
            onEnded={() => { setPlaying(false); userPaused.current = true; }}
            onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
            onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
            onClick={toggle}
          >
            <noscript><a href="/__f/nabin-brand-film-720p.mp4">Watch the film (MP4)</a></noscript>
          </video>

          <button
            type="button"
            onClick={toggleMute}
            className="absolute right-3 top-3 z-20 flex h-11 items-center gap-2 rounded-full bg-black/60 px-4 text-[13px] font-medium text-[#F2F4F2] ring-1 ring-white/20 backdrop-blur-sm transition-colors hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
            aria-pressed={!muted}
            aria-label={muted ? "Unmute the film" : "Mute the film"}
          >
            {muted ? <VolumeX size={18} aria-hidden /> : <Volume2 size={18} aria-hidden />}
            <span>{muted ? "Unmute" : "Mute"}</span>
          </button>

          {!playing ? (
            <button
              type="button"
              onClick={toggle}
              className="absolute left-1/2 top-1/2 z-10 flex h-[60px] w-[60px] sm:h-[72px] sm:w-[72px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#F2F4F2] text-ink shadow-[0_12px_40px_rgba(0,0,0,.45)] transition-transform duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 focus-visible:ring-offset-black md:h-[88px] md:w-[88px]"
              aria-label={started ? "Play the film" : "Play the film (1 minute 4 seconds)"}
            >
              <Play size={26} className="ml-1" aria-hidden fill="currentColor" />
            </button>
          ) : null}

          {loaded ? null : <span className="sr-only">The film loads when you press play or scroll to it.</span>}
        </div>

        <details className="mt-5 max-w-[70ch] text-[14px] leading-relaxed text-mist/60">
          <summary className="cursor-pointer select-none font-mono text-[11.5px] uppercase tracking-[0.14em] text-mist/60 hover:text-mist">On-screen text</summary>
          <div id="film-desc" className="mt-3 space-y-2">
            <p>Music only, no narration. Original score.</p>
            <p>1. Nabin Babu Uranw (नवीन बाबु उराँव). 2. “I’m Nabin Babu Uranw — I Build Digital Experiences.” Based in Inaruwa, Sunsari, Koshi Province, Nepal. Full-Stack Developer, Website Developer, UI/UX Designer, Automation Specialist. “I design and develop modern websites, web applications and digital products.” 3. Skills: Frontend Development, Backend Development, UI/UX Design, AI Integration, Automation, Database Architecture. 4. Selected work, captured from the live sites: NEXA, Byawastha, Chukta, Palo, Kotha, and the IEBS school website (independent demo); also Nepali Date, My Predictor, ADSRUN Agency, Aama Collection (concept), Trishna (concept) and this portfolio. 5. Code from the Kotha repository beside its rent ledger (demo data), and Chukta, Palo and Kotha on desktop and phone. 6. Nabin Babu Uranw, Independent Developer | Digital Creator, nabinbabuuranw.com.np.</p>
          </div>
        </details>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org", "@type": "VideoObject",
          name: "I’m Nabin Babu Uranw — I Build Digital Experiences.",
          description: "A one-minute introduction to Nabin Babu Uranw, an independent developer from Inaruwa, Sunsari, Nepal, with real projects captured from their live sites.",
          thumbnailUrl: "https://nabinbabuuranw.com.np/film/nabin-brand-film-poster.jpg",
          uploadDate: "2026-11-03", duration: "PT1M4S",
          contentUrl: "https://nabinbabuuranw.com.np/__f/nabin-brand-film-1080p.mp4",
        }) }}
      />
    </section>
  );
}
