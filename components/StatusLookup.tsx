"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Download, Loader2, MessageCircle, X } from "lucide-react";
import { STATUS_LABEL, STATUS_PATH, statusLookupSchema, type Status } from "@/lib/request-schema";

type Result = {
  id: string; project: string; status: Status; statusLabel: string; createdAt: number; updatedAt: number;
  timeline: { status: Status; label: string; at: number }[]; messages: { at: number; body: string }[]; pdfUrl: string | null; whatsapp: string;
};
const field = "w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3.5 text-[16px] text-paper placeholder:text-mist/40 transition-colors hover:border-white/30 focus:border-sage focus:outline-none";
const when = (ms: number) => new Date(ms).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kathmandu" }) + " NPT";

export function StatusLookup() {
  const [id, setId] = useState("");
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const resRef = useRef<HTMLHeadingElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = new URLSearchParams(location.search).get("id");
    if (q) { setId(q.toUpperCase().slice(0, 20)); emailRef.current?.focus(); }
  }, []);
  useEffect(() => { if (res) resRef.current?.focus(); }, [res]);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    const p = statusLookupSchema.safeParse({ id, email });
    if (!p.success) { setErr(p.error.issues[0]?.message || "Check the ID and email"); return; }
    setBusy(true); setErr(""); setRes(null);
    try {
      const r = await fetch("/api/status", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(p.data) });
      const b = await r.json().catch(() => ({}));
      if (r.ok && b.ok) setRes(b);
      else setErr(b.message || "We couldn’t find a request with that ID and email. Check both and try again.");
    } catch { setErr("Couldn’t reach the server. Check your connection and try again."); }
    setBusy(false);
  }

  const cancelled = res?.status === "cancelled";
  const reached = (s: Status) => !!res && (res.timeline.some((t) => t.status === s) || STATUS_PATH.indexOf(s) <= STATUS_PATH.indexOf(res.status));
  const at = (s: Status) => res?.timeline.filter((t) => t.status === s).pop()?.at;

  return (
    <div className="shell grid gap-12 py-16 md:py-24 lg:grid-cols-12 lg:gap-10">
      <div className="lg:col-span-5">
        <p className="flex items-center gap-3 font-mono text-[11.5px] uppercase tracking-[0.14em] text-mist/75"><span className="h-px w-8 bg-sage" aria-hidden />Check status</p>
        <h1 className="mt-5 max-w-[14ch] font-display text-[clamp(2.3rem,5.4vw,4rem)] font-semibold leading-[0.98] tracking-tightest">Where’s my request?</h1>
        <p className="mt-6 max-w-[44ch] text-[17px] leading-relaxed text-mist/75">Enter your request ID and the email you used. Only the person who sent a request can see it.</p>
        <form onSubmit={lookup} noValidate className="mt-9 grid gap-5" aria-label="Check request status">
          <div><label htmlFor="st-id" className="mb-2 block text-[14px] text-mist/85">Request ID</label>
            <input id="st-id" value={id} onChange={(e) => setId(e.target.value.toUpperCase())} placeholder="NBR-2026-AB12" autoComplete="off" autoCapitalize="characters" spellCheck={false} className={`${field} font-mono tracking-wide`} aria-describedby={err ? "st-err" : undefined} /></div>
          <div><label htmlFor="st-email" className="mb-2 block text-[14px] text-mist/85">Email address</label>
            <input id="st-email" ref={emailRef} type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} aria-describedby={err ? "st-err" : undefined} /></div>
          <div className="flex flex-wrap items-center gap-4">
            <button type="submit" disabled={busy} className="btn bg-sage text-ink hover:bg-paper disabled:opacity-60 focus-visible:ring-sage focus-visible:ring-offset-ink">
              {busy ? <><Loader2 size={17} className="animate-spin" aria-hidden />Checking…</> : <>Check status<ArrowRight size={17} aria-hidden /></>}
            </button>
            <a href="/#request" className="text-[15px] text-mist/80 underline decoration-white/25 underline-offset-4 hover:text-sage">New request</a>
          </div>
          {err ? <p id="st-err" role="alert" className="text-[14.5px] text-[#F0B9AE]">{err}</p> : null}
        </form>
      </div>

      <div className="lg:col-span-7" aria-live="polite">
        {res ? (
          <article className="rounded-[20px] border border-white/15 p-6 sm:p-9">
            <p className="font-mono text-[12px] uppercase tracking-[0.12em] text-mist/70">Request <span className="text-paper">{res.id}</span></p>
            <h2 ref={resRef} tabIndex={-1} className="mt-3 font-display text-[clamp(1.6rem,3.6vw,2.2rem)] font-semibold leading-tight tracking-tight focus:outline-none">{res.project}</h2>
            <dl className="mt-6 grid grid-cols-2 gap-4 border-y border-white/10 py-5 text-[14.5px]">
              <div><dt className="text-mist/70">Current status</dt><dd className="mt-1"><span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[14px] font-medium ${cancelled ? "bg-white/10 text-mist" : "bg-sage text-ink"}`}>{res.statusLabel}</span></dd></div>
              <div><dt className="text-mist/70">Last updated</dt><dd className="mt-1.5 text-paper/90">{when(res.updatedAt)}</dd></div>
            </dl>

            <h3 className="mt-7 font-mono text-[11.5px] uppercase tracking-[0.14em] text-mist/70">Progress</h3>
            <ol className="mt-4">
              {STATUS_PATH.map((s, i) => {
                const done = reached(s) && !(cancelled && !res.timeline.some((t) => t.status === s));
                const current = res.status === s;
                return (
                  <li key={s} className="relative flex gap-4 pb-5 last:pb-0" aria-current={current ? "step" : undefined}>
                    {i < STATUS_PATH.length - 1 ? <span className={`absolute left-[11px] top-7 h-[calc(100%-1.5rem)] w-px ${done ? "bg-sage/60" : "bg-white/10"}`} aria-hidden /> : null}
                    <span className={`relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full border ${current ? "border-sage bg-sage text-ink" : done ? "border-sage/70 text-sage" : "border-white/20 text-transparent"}`} aria-hidden>{done ? <Check size={13} /> : null}</span>
                    <div className="-mt-0.5">
                      <p className={`text-[15.5px] ${current ? "font-medium text-paper" : done ? "text-paper/85" : "text-mist/55"}`}>{STATUS_LABEL[s]}<span className="sr-only">{current ? " (current)" : done ? " (done)" : " (not yet)"}</span></p>
                      {at(s) ? <p className="text-[13px] text-mist/65">{when(at(s)!)}</p> : null}
                    </div>
                  </li>
                );
              })}
              {cancelled ? (
                <li className="relative mt-5 flex gap-4" aria-current="step">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-white/40 bg-white/10 text-paper" aria-hidden><X size={13} /></span>
                  <div className="-mt-0.5"><p className="text-[15.5px] font-medium text-paper">Cancelled</p>{at("cancelled") ? <p className="text-[13px] text-mist/65">{when(at("cancelled")!)}</p> : null}</div>
                </li>
              ) : null}
            </ol>

            <h3 className="mt-8 font-mono text-[11.5px] uppercase tracking-[0.14em] text-mist/70">Messages &amp; next steps</h3>
            {res.messages.length ? (
              <ul className="mt-4 space-y-3">
                {[...res.messages].reverse().map((m) => (
                  <li key={m.at} className="border-l-2 border-sage/70 bg-white/[0.03] px-4 py-3">
                    <p className="whitespace-pre-line text-[15.5px] leading-relaxed text-paper/90">{m.body}</p>
                    <p className="mt-1.5 text-[12.5px] text-mist/65">Nabin · {when(m.at)}</p>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-3 text-[15px] text-mist/70">No messages yet. Nabin will contact you after reviewing your requirements.</p>}

            <div className="mt-8 flex flex-wrap gap-3 border-t border-white/10 pt-6">
              {res.pdfUrl ? <a href={res.pdfUrl} download={`Website-Request-${res.id}.pdf`} className="btn border border-white/20 text-paper hover:border-sage hover:text-sage focus-visible:ring-sage focus-visible:ring-offset-ink"><Download size={17} aria-hidden />Download PDF again</a> : null}
              <a href={res.whatsapp} target="_blank" rel="noopener noreferrer" className="btn border border-white/20 text-paper hover:border-sage hover:text-sage focus-visible:ring-sage focus-visible:ring-offset-ink"><MessageCircle size={17} aria-hidden />Message on WhatsApp</a>
            </div>
          </article>
        ) : (
          <div className="hidden h-full min-h-[300px] items-center justify-center rounded-[20px] border border-dashed border-white/10 p-10 text-center text-[15px] text-mist/55 lg:flex">
            Your request’s status, timeline and messages appear here.
          </div>
        )}
      </div>
    </div>
  );
}
