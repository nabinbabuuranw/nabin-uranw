"use client";
import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";

const shots = [
  { key: "home", tab: "Home", alt: "Trishna – The Craving Tales home page on a laptop", w: 1200, h: 750, mobile: "/img/trishna/home-m.webp" },
  { key: "order", tab: "Ordering", alt: "Trishna online ordering page with the menu and cart", w: 1200, h: 750, mobile: "/img/trishna/order-m.webp" },
  { key: "admin", tab: "Admin", alt: "Trishna admin dashboard with order stats and the orders chart", w: 1024, h: 640, mobile: null },
] as const;

const features = [
  "Menu, cart and order placement",
  "Live order tracking for customers",
  "Admin dashboard with order management and stats",
  "Automatic 72-hour order retention, run hourly by a server-side cron",
  "Customer login with Clerk",
];
const stack = ["Next.js 15", "Prisma", "PostgreSQL", "Clerk", "Antideploy"];

export function FeaturedTrishna() {
  const [i, setI] = useState(0);
  const s = shots[i];
  const big = s.key === "admin" ? "/img/trishna/admin-1024.webp" : `/img/trishna/${s.key}-1200.webp`;
  return (
    <article id="trishna" aria-labelledby="trishna-title" data-featured="trishna"
      className="mt-8 grid min-w-0 gap-6 overflow-hidden rounded-[20px] border border-mist bg-white p-4 sm:p-6 lg:gap-8 lg:p-8">
      <div className="min-w-0">
        <div className="relative pb-0 sm:pb-6 sm:pr-10">
          <div className="overflow-hidden rounded-[14px] border border-mist bg-paper">
            <img key={big} src={big} srcSet={`/img/trishna/${s.key}-640.webp 640w, ${big} ${s.w}w`} sizes="(min-width: 1024px) 720px, 92vw"
              width={s.w} height={s.h} alt={s.alt} loading="lazy" decoding="async" className="block aspect-[16/10] h-auto w-full object-cover object-top" />
          </div>
          {s.mobile ? (
            <div className="absolute bottom-0 right-0 hidden w-[22%] max-w-[150px] overflow-hidden rounded-[14px] border-[3px] border-ink bg-ink shadow-[0_18px_40px_-18px_rgba(31,36,33,.55)] sm:block" aria-hidden>
              <img src={s.mobile} width={375} height={750} alt="" loading="lazy" decoding="async" className="block aspect-[1/2] h-auto w-full object-cover object-top" />
            </div>
          ) : null}
        </div>
        <div role="group" aria-label="Trishna screenshots" className="mt-4 flex flex-wrap gap-2">
          {shots.map((x, n) => (
            <button key={x.key} type="button" aria-pressed={n === i} onClick={() => setI(n)}
              className={`inline-flex min-h-[40px] items-center rounded-full border px-4 text-[14px] transition-colors ${n === i ? "border-ink bg-ink text-paper" : "border-ink/15 bg-white text-ink/80 hover:border-ink/40"}`}>
              {x.tab}
            </button>
          ))}
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[12px]">
          <span className="inline-flex items-center gap-2 text-ink/80"><span className="h-1.5 w-1.5 rounded-full bg-fern" aria-hidden />Featured build</span>
          <span className="text-muted">Own concept project</span>
        </div>
        <h3 id="trishna-title" className="mt-4 font-display text-[clamp(1.7rem,3.2vw,2.25rem)] font-semibold leading-[1.05] tracking-tight text-ink">
          Trishna <span className="text-teal">–</span> The Craving Tales
        </h3>
        <p className="mt-1 font-mono text-[12.5px] text-muted">Restaurant website · online ordering</p>
        <div className="mt-5 grid gap-6 md:grid-cols-[1fr_1.1fr] md:gap-8">
          <div className="flex min-w-0 flex-col">
            <p className="text-[15.5px] leading-relaxed text-ink/80">
              A full-stack restaurant website where customers browse the menu, fill a cart, place an order and track it live, with an admin side to run it all.
            </p>
            <ul className="mt-5 flex flex-wrap gap-1.5" aria-label="Technologies">
              {stack.map((t) => <li key={t} className="chip">{t}</li>)}
            </ul>
            <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-3 pt-6">
              <a href="#contact" className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-ink px-4 text-[14px] text-paper transition-colors hover:bg-teal">
                Contact<ArrowRight size={14} aria-hidden />
              </a>
              <p className="font-mono text-[12px] text-muted">Live demo available on request</p>
            </div>
          </div>
          <ul className="min-w-0 space-y-2.5 md:border-l md:border-mist md:pl-8" aria-label="Features">
            {features.map((f) => (
              <li key={f} className="flex gap-2.5 text-[14.5px] leading-snug text-ink/85">
                <Check size={16} className="mt-[2px] shrink-0 text-teal" aria-hidden />{f}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}
