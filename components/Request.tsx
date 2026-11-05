"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, ChevronDown, Copy, Download, Loader2, MessageCircle, Search } from "lucide-react";
import { BUDGETS, COUNTRY_CODES, WEBSITE_TYPES, stepAbout, stepBudget, stepProject, stepRefs } from "@/lib/request-schema";
import { Reveal } from "./Reveal";

const STEPS = [
  { n: "01", title: "About you", schema: stepAbout, key: "about" },
  { n: "02", title: "The project", schema: stepProject, key: "project" },
  { n: "03", title: "Budget & timing", schema: stepBudget, key: "budget" },
  { n: "04", title: "References", schema: stepRefs, key: "refs" },
] as const;

type Form = {
  about: { name: string; organization: string; email: string; countryCode: string; phone: string };
  project: { websiteType: string; description: string; features: string };
  budget: { budget: string; flexible: boolean; completionDate: string };
  refs: { existingUrl: string; referenceSites: string; referenceNotes: string };
};
const EMPTY: Form = {
  about: { name: "", organization: "", email: "", countryCode: "+977", phone: "" },
  project: { websiteType: "", description: "", features: "" },
  budget: { budget: "", flexible: false, completionDate: "" },
  refs: { existingUrl: "", referenceSites: "", referenceNotes: "" },
};
type Done = { id: string; pdfUrl: string | null; whatsapp: string; email: string; duplicate?: boolean };

const field = "w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3.5 text-[16px] text-paper placeholder:text-mist/40 transition-colors hover:border-white/30 focus:border-sage focus:outline-none aria-[invalid=true]:border-[#E8A598]";
const labelCls = "mb-2 block text-[14px] text-mist/85";

export function RequestSection() {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [f, setF] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "sending" | "error">("idle");
  const [note, setNote] = useState("");
  const [done, setDone] = useState<Done | null>(null);
  const [copied, setCopied] = useState(false);
  const started = useRef(Date.now());
  const headRef = useRef<HTMLHeadingElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    headRef.current?.focus({ preventScroll: true });
    const form = document.getElementById("request-form");
    if (form && form.getBoundingClientRect().top < 64) form.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }, [step]);
  useEffect(() => { if (done) { doneRef.current?.focus({ preventScroll: true }); document.getElementById("request-done")?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }); } }, [done]);

  const set = <K extends keyof Form>(k: K, patch: Partial<Form[K]>) => {
    setF((v) => ({ ...v, [k]: { ...v[k], ...patch } }));
    setErrors((e) => { const n = { ...e }; for (const p of Object.keys(patch)) delete n[p]; return n; });
  };

  function check(i: number) {
    const s = STEPS[i];
    const r = s.schema.safeParse(f[s.key]);
    if (r.success) return true;
    const errs: Record<string, string> = {};
    for (const iss of r.error.issues) { const k = String(iss.path[0] ?? ""); if (k && !errs[k]) errs[k] = iss.message; }
    setErrors(errs);
    requestAnimationFrame(() => { const first = Object.keys(errs)[0]; (document.getElementById(`rq-${first}`) as HTMLElement | null)?.focus(); });
    return false;
  }
  const go = (to: number) => { setDir(to > step ? 1 : -1); setErrors({}); setStep(to); };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "sending") return;
    if (!check(step)) return;
    if (step < STEPS.length - 1) { go(step + 1); return; }
    for (let i = 0; i < STEPS.length; i++) if (!STEPS[i].schema.safeParse(f[STEPS[i].key]).success) { go(i); setTimeout(() => check(i), 50); return; }
    setState("sending"); setNote("");
    const hp = (document.getElementById("rq-website") as HTMLInputElement | null)?.value ?? "";
    try {
      const r = await fetch("/api/requests", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...f, website: hp, elapsedMs: Date.now() - started.current }) });
      const b = await r.json().catch(() => ({}));
      if (r.ok && b.ok && !b.bot) { setDone({ id: b.id, pdfUrl: b.pdfUrl, whatsapp: b.whatsapp, email: f.about.email, duplicate: b.duplicate }); setState("idle"); return; }
      if (r.status === 400 && b.errors) {
        const keys = Object.keys(b.errors);
        const idx = STEPS.findIndex((s) => keys.some((k) => k.startsWith(s.key + ".")));
        const errs: Record<string, string> = {};
        for (const k of keys) errs[k.split(".").pop()!] = b.errors[k];
        if (idx >= 0) { setDir(-1); setStep(idx); }
        setErrors(errs); setState("idle"); return;
      }
      setState("error");
      setNote(b.message || (r.status === 429 ? "Too many requests from this connection. Please try again later." : "Something went wrong saving your request. Please try again, or call/WhatsApp +977 976-446-5688."));
    } catch { setState("error"); setNote("Couldn’t reach the server. Check your connection and try again."); }
  }

  const err = (k: string) => errors[k] ? <p id={`rq-${k}-err`} className="mt-2 text-[13.5px] text-[#F0B9AE]">{errors[k]}</p> : null;
  const aria = (k: string) => ({ id: `rq-${k}`, name: k, "aria-invalid": !!errors[k], "aria-describedby": errors[k] ? `rq-${k}-err` : undefined });
  const copy = async () => { if (!done) return; try { await navigator.clipboard.writeText(done.id); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard blocked */ } };

  return (
    <section id="request" aria-labelledby="request-title" className="bg-ink text-paper">
      <div className="shell grid gap-12 py-20 md:py-28 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <p className="flex items-center gap-3 font-mono text-[11.5px] uppercase tracking-[0.14em] text-mist/75"><span className="h-px w-8 bg-sage" aria-hidden />Request a website</p>
            <Reveal><h2 id="request-title" className="mt-5 max-w-[14ch] font-display text-[clamp(2.4rem,5.6vw,4.2rem)] font-semibold leading-[0.98] tracking-tightest">Tell me about your project.</h2></Reveal>
            <p className="mt-6 max-w-[44ch] text-[17px] leading-relaxed text-mist/75">About five minutes. Rough answers are fine; we will go through the details together.</p>
            <ol className="mt-10 border-t border-white/10">
              {["Get a request ID as soon as you submit.", "Nabin reviews your requirements and contacts you.", "Track the status any time with your ID and email."].map((t, i) => (
                <li key={t} className="flex gap-5 border-b border-white/10 py-4">
                  <span className="font-mono text-[13px] text-sage">0{i + 1}</span>
                  <span className="text-[16px] leading-snug text-paper/90">{t}</span>
                </li>
              ))}
            </ol>
            <p className="mt-8 text-[15.5px] text-mist/75">Rather talk? Call or WhatsApp <a href="tel:+9779764465688" className="whitespace-nowrap text-paper underline decoration-sage/60 underline-offset-4 hover:decoration-sage">+977 976-446-5688</a>.</p>
            <a href="/status" className="mt-4 inline-flex min-h-[44px] items-center gap-2 text-[15px] text-sage hover:text-paper"><Search size={16} aria-hidden />Already sent one? Check its status</a>
          </div>
        </div>

        <div className="lg:col-span-7">
          {done ? (
            <div id="request-done" className="scroll-mt-24 rounded-[20px] border border-white/15 p-6 sm:p-9" role="status" aria-live="polite">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-sage text-ink"><Check size={22} aria-hidden /></span>
              <h3 ref={doneRef} tabIndex={-1} className="mt-6 font-display text-[clamp(1.7rem,4vw,2.4rem)] font-semibold leading-[1.05] tracking-tight focus:outline-none">Your Website Request Is Ready!</h3>
              <p className="mt-6 font-mono text-[11.5px] uppercase tracking-[0.14em] text-mist/70">Request ID</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <span className="font-mono text-[clamp(1.6rem,6vw,2.3rem)] font-medium tracking-wide text-paper" data-request-id>{done.id}</span>
                <button type="button" onClick={copy} className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-white/15 px-4 text-[13.5px] text-mist hover:border-sage hover:text-sage">
                  {copied ? <><Check size={15} aria-hidden />Copied</> : <><Copy size={15} aria-hidden />Copy ID</>}
                </button>
              </div>
              {done.duplicate ? <p className="mt-3 text-[14.5px] text-mist/75">You sent this same request a few minutes ago, so here is its ID again.</p> : null}
              {done.pdfUrl ? <p className="mt-5 text-[16px] text-paper/90">Your project requirements PDF has been generated successfully.</p>
                : <p className="mt-5 text-[16px] text-paper/90">Your request is saved. The PDF couldn’t be generated just now; you can download it later from the status page.</p>}

              <div className="mt-7 grid gap-3">
                {done.pdfUrl ? (
                  <a href={done.pdfUrl} download={`Website-Request-${done.id}.pdf`} className="btn w-full bg-sage text-ink hover:bg-paper focus-visible:ring-sage focus-visible:ring-offset-ink sm:justify-between">
                    <span className="flex items-center gap-3"><span className="grid h-6 w-6 place-items-center rounded-full bg-ink/10 font-mono text-[12px]">1</span>Download Project PDF</span><Download size={18} aria-hidden />
                  </a>
                ) : null}
                <a href={done.whatsapp} target="_blank" rel="noopener noreferrer" className="btn w-full border border-white/20 text-paper hover:border-sage hover:text-sage focus-visible:ring-sage focus-visible:ring-offset-ink sm:justify-between">
                  <span className="flex items-center gap-3">{done.pdfUrl ? <span className="grid h-6 w-6 place-items-center rounded-full bg-white/10 font-mono text-[12px]">2</span> : null}Send Request via WhatsApp</span><MessageCircle size={18} aria-hidden />
                </a>
                <p className="px-1 text-[14px] leading-relaxed text-mist/75">Please attach your downloaded PDF in WhatsApp and press Send.</p>
                <a href={`/status?id=${encodeURIComponent(done.id)}`} className="btn w-full text-mist hover:text-sage focus-visible:ring-sage focus-visible:ring-offset-ink sm:w-auto sm:justify-start sm:px-1">
                  <Search size={17} aria-hidden />Track Your Request
                </a>
              </div>
              <p className="mt-6 border-t border-white/10 pt-5 text-[14px] leading-relaxed text-mist/70">A confirmation email with your ID is being sent to <span className="text-paper/90">{done.email}</span>. Keep your ID: with your email, it opens your request’s status.</p>
            </div>
          ) : (
            <form id="request-form" onSubmit={onSubmit} noValidate className="relative scroll-mt-24 rounded-[20px] border border-white/15 p-5 sm:p-8" aria-label="Request a website">
              <ol className="grid grid-cols-4 gap-2" aria-label="Form progress">
                {STEPS.map((s, i) => (
                  <li key={s.n} aria-current={i === step ? "step" : undefined}>
                    <span className="block h-[3px] overflow-hidden rounded-full bg-white/10">
                      <span className="block h-full origin-left bg-sage transition-transform duration-500 ease-out motion-reduce:transition-none" style={{ transform: `scaleX(${i < step ? 1 : i === step ? 0.5 : 0})` }} />
                    </span>
                    <span className={`mt-2.5 hidden font-mono text-[11px] uppercase tracking-[0.1em] sm:block ${i === step ? "text-paper" : i < step ? "text-sage" : "text-mist/70"}`}>{s.n} {s.title}</span>
                    <span className="sr-only">{`Step ${i + 1}: ${s.title}${i < step ? " (done)" : ""}`}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-3 font-mono text-[11.5px] uppercase tracking-[0.12em] text-mist/70 sm:hidden" aria-hidden>Step {step + 1} of 4</p>

              <div className="relative mt-7 min-h-[390px]">
                <AnimatePresence mode="wait" initial={false} custom={dir}>
                  <motion.fieldset key={step} custom={dir}
                    initial={{ opacity: 0, x: dir * 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -28 }}
                    transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }} className="min-w-0">
                    <legend className="contents">
                      <h3 ref={headRef} tabIndex={-1} className="flex items-baseline gap-3 font-display text-[24px] font-semibold tracking-tight focus:outline-none sm:text-[26px]">
                        <span className="font-mono text-[14px] font-normal text-sage">{STEPS[step].n} —</span>{STEPS[step].title}
                      </h3>
                    </legend>

                    {step === 0 ? (
                      <div className="mt-6 grid gap-5 sm:grid-cols-2">
                        <div><label htmlFor="rq-name" className={labelCls}>Your name <span className="text-sage" aria-hidden>*</span><span className="sr-only">(required)</span></label>
                          <input {...aria("name")} autoComplete="name" required value={f.about.name} onChange={(e) => set("about", { name: e.target.value })} className={field} />{err("name")}</div>
                        <div><label htmlFor="rq-organization" className={labelCls}>Business or organization</label>
                          <input {...aria("organization")} autoComplete="organization" value={f.about.organization} onChange={(e) => set("about", { organization: e.target.value })} className={field} />{err("organization")}</div>
                        <div className="sm:col-span-2"><label htmlFor="rq-email" className={labelCls}>Email address <span className="text-sage" aria-hidden>*</span><span className="sr-only">(required)</span></label>
                          <input {...aria("email")} type="email" inputMode="email" autoComplete="email" required value={f.about.email} onChange={(e) => set("about", { email: e.target.value })} className={field} />{err("email")}</div>
                        <div className="sm:col-span-2">
                          <label htmlFor="rq-phone" className={labelCls}>Phone / WhatsApp <span className="text-sage" aria-hidden>*</span><span className="sr-only">(required)</span></label>
                          <div className="flex gap-2">
                            <div className="relative w-[128px] shrink-0">
                              <label htmlFor="rq-countryCode" className="sr-only">Country code</label>
                              <select {...aria("countryCode")} autoComplete="tel-country-code" value={f.about.countryCode} onChange={(e) => set("about", { countryCode: e.target.value })} className={`${field} appearance-none pl-3 pr-7 text-[15px] [&>option]:bg-ink`}>
                                {COUNTRY_CODES.map((c) => <option key={c.code + c.label} value={c.code}>{c.code} {c.label}</option>)}
                              </select>
                              <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-mist/70" aria-hidden />
                            </div>
                            <input {...aria("phone")} type="tel" inputMode="tel" autoComplete="tel-national" placeholder="98XXXXXXXX" required value={f.about.phone} onChange={(e) => set("about", { phone: e.target.value })} className={`${field} min-w-0 flex-1`} />
                          </div>{err("phone")}{err("countryCode")}
                        </div>
                      </div>
                    ) : null}

                    {step === 1 ? (
                      <div className="mt-6 grid gap-5">
                        <div><label htmlFor="rq-websiteType" className={labelCls}>Website type <span className="text-sage" aria-hidden>*</span><span className="sr-only">(required)</span></label>
                          <div className="relative">
                            <select {...aria("websiteType")} required value={f.project.websiteType} onChange={(e) => set("project", { websiteType: e.target.value })} className={`${field} appearance-none pr-10 [&>option]:bg-ink ${f.project.websiteType ? "" : "text-mist/60"}`}>
                              <option value="" disabled>Choose a type</option>
                              {WEBSITE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-mist/70" aria-hidden />
                          </div>{err("websiteType")}</div>
                        <div><label htmlFor="rq-description" className={labelCls}>Project description <span className="text-sage" aria-hidden>*</span><span className="sr-only">(required)</span></label>
                          <textarea {...aria("description")} rows={4} required placeholder="What is it for, who will use it, and what should it achieve?" value={f.project.description} onChange={(e) => set("project", { description: e.target.value })} className={`${field} resize-y`} />{err("description")}</div>
                        <div><label htmlFor="rq-features" className={labelCls}>Required features</label>
                          <textarea {...aria("features")} rows={3} placeholder="What features do you need? For example: online booking, gallery, admin panel, payment, Nepali language." value={f.project.features} onChange={(e) => set("project", { features: e.target.value })} className={`${field} resize-y`} />{err("features")}</div>
                      </div>
                    ) : null}

                    {step === 2 ? (
                      <div className="mt-6 grid gap-6">
                        <div role="radiogroup" aria-labelledby="rq-budget-label" aria-describedby={errors.budget ? "rq-budget-err" : undefined}>
                          <p id="rq-budget-label" className={labelCls}>Budget <span className="text-sage" aria-hidden>*</span><span className="sr-only">(required)</span></p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {BUDGETS.map((b, i) => (
                              <label key={b} className={`flex min-h-[52px] cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-[15px] transition-colors ${f.budget.budget === b ? "border-sage bg-sage/10 text-paper" : "border-white/15 text-paper/85 hover:border-white/30"}`}>
                                <input type="radio" name="budget" value={b} id={i === 0 ? "rq-budget" : undefined} checked={f.budget.budget === b} onChange={() => set("budget", { budget: b })} className="h-4 w-4 accent-[#9CC5A1]" />
                                {b}
                              </label>
                            ))}
                          </div>{err("budget")}
                        </div>
                        <div>
                          <label htmlFor="rq-completionDate" className={labelCls}>Preferred completion date</label>
                          <div className="flex flex-wrap items-center gap-4">
                            <input {...aria("completionDate")} type="date" min={today} disabled={f.budget.flexible} value={f.budget.completionDate} onChange={(e) => set("budget", { completionDate: e.target.value })} className={`${field} w-full max-w-[240px] [color-scheme:dark] disabled:opacity-40`} />
                            <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-3 text-[15px] text-paper/90">
                              <input type="checkbox" checked={f.budget.flexible} onChange={(e) => set("budget", { flexible: e.target.checked, completionDate: e.target.checked ? "" : f.budget.completionDate })} className="h-[18px] w-[18px] accent-[#9CC5A1]" />
                              I’m flexible
                            </label>
                          </div>{err("completionDate")}
                        </div>
                      </div>
                    ) : null}

                    {step === 3 ? (
                      <div className="mt-6 grid gap-5">
                        <div><label htmlFor="rq-existingUrl" className={labelCls}>Existing website <span className="text-mist/70">(optional)</span></label>
                          <input {...aria("existingUrl")} type="url" inputMode="url" placeholder="yourbusiness.com" value={f.refs.existingUrl} onChange={(e) => set("refs", { existingUrl: e.target.value })} className={field} />{err("existingUrl")}</div>
                        <div><label htmlFor="rq-referenceSites" className={labelCls}>Websites you like <span className="text-mist/70">(optional)</span></label>
                          <textarea {...aria("referenceSites")} rows={2} placeholder="One link per line" value={f.refs.referenceSites} onChange={(e) => set("refs", { referenceSites: e.target.value })} className={`${field} resize-y`} />{err("referenceSites")}</div>
                        <div><label htmlFor="rq-referenceNotes" className={labelCls}>What you like about those websites</label>
                          <textarea {...aria("referenceNotes")} rows={3} placeholder="The layout, the colours, how easy booking is…" value={f.refs.referenceNotes} onChange={(e) => set("refs", { referenceNotes: e.target.value })} className={`${field} resize-y`} />{err("referenceNotes")}</div>
                      </div>
                    ) : null}
                  </motion.fieldset>
                </AnimatePresence>
              </div>

              <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden>
                <label htmlFor="rq-website">Leave this empty</label><input id="rq-website" name="website" tabIndex={-1} autoComplete="off" />
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6">
                {step > 0 ? (
                  <button type="button" onClick={() => go(step - 1)} className="btn border border-white/15 px-5 text-paper hover:border-white/40 focus-visible:ring-sage focus-visible:ring-offset-ink"><ArrowLeft size={17} aria-hidden />Back</button>
                ) : <span className="text-[13.5px] text-mist/70"><span className="text-sage">*</span> required</span>}
                <button type="submit" disabled={state === "sending"} className="btn bg-sage text-ink hover:bg-paper disabled:opacity-60 focus-visible:ring-sage focus-visible:ring-offset-ink">
                  {state === "sending" ? <><Loader2 size={17} className="animate-spin" aria-hidden />Submitting…</> : step < 3 ? <>Continue<ArrowRight size={17} aria-hidden /></> : <>Submit Request<ArrowRight size={17} aria-hidden /></>}
                </button>
              </div>
              {state === "error" ? <p className="mt-4 text-[14.5px] text-[#F0B9AE]" role="alert">{note}</p> : null}
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
