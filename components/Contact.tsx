"use client";
import { useRef, useState } from "react";
import { ArrowUpRight, Check, Github, Loader2, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { contactSchema } from "@/lib/contact-schema";
import { site } from "@/data/site";
import { Reveal } from "./Reveal";

// Email relay: FormSubmit (free). The visitor's browser hands the already-validated, stored message
// to it, because FormSubmit refuses server-to-server calls. One-time activation by the inbox owner.
const RELAY = `https://formsubmit.co/ajax/${process.env.NEXT_PUBLIC_CONTACT_RELAY || site.email}`;

async function relay(id: string, d: { name: string; email: string; subject?: string; message: string }) {
  try {
    const r = await fetch(RELAY, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        _subject: `Portfolio: ${d.subject || "new message"} — from ${d.name}`, _template: "table", _captcha: "false", _replyto: d.email,
        name: d.name, email: d.email, subject: d.subject || "(none)", message: d.message, reference: id,
      }),
    });
    const b = await r.json().catch(() => ({}));
    const ok = r.ok && (b.success === true || b.success === "true");
    fetch("/api/contact/ack", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, ok, detail: String(b.message ?? r.status).slice(0, 160) }) }).catch(() => {});
    return ok;
  } catch {
    fetch("/api/contact/ack", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, ok: false, detail: "network" }) }).catch(() => {});
    return false;
  }
}

type Errors = Partial<Record<"name" | "email" | "subject" | "message", string>>;

export function Contact() {
  const started = useRef<number>(Date.now());
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [note, setNote] = useState<string>("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const raw = {
      name: String(fd.get("name") ?? ""), email: String(fd.get("email") ?? ""),
      subject: String(fd.get("subject") ?? ""), message: String(fd.get("message") ?? ""),
      website: String(fd.get("website") ?? ""), elapsedMs: Date.now() - started.current,
    };
    const form = e.currentTarget;
    const parsed = contactSchema.safeParse(raw);
    if (!parsed.success) {
      const errs: Errors = {};
      for (const i of parsed.error.issues) { const k = i.path[0] as keyof Errors; if (k && !errs[k]) errs[k] = i.message; }
      setErrors(errs); setStatus("idle");
      const first = Object.keys(errs)[0]; if (first) (form.elements.namedItem(first) as HTMLElement | null)?.focus();
      return;
    }
    setErrors({}); setStatus("sending"); setNote("");
    try {
      const r = await fetch("/api/contact", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(parsed.data) });
      const body = await r.json().catch(() => ({}));
      if (r.ok && body.ok) {
        if (body.id) await relay(body.id, parsed.data);
        setStatus("sent"); return;
      }
      if (r.status === 400 && body.errors) { setErrors(body.errors); setStatus("idle"); return; }
      setStatus("error"); setNote(r.status === 429 ? "Too many messages from this network. Please try again in a few minutes, or email me directly." : "Something went wrong sending your message. Please email me directly.");
    } catch {
      setStatus("error"); setNote("Couldn’t reach the server. Please email me directly.");
    }
  }

  const field = "w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3.5 text-[16px] text-paper placeholder:text-mist/45 transition-colors hover:border-white/30 focus:border-sage focus:outline-none";
  const err = (k: keyof Errors) => errors[k] ? <p id={`${k}-err`} className="mt-2 text-[13px] text-sage">{errors[k]}</p> : null;

  return (
    <section id="contact" aria-labelledby="contact-title" className="dotgrid-dark bg-ink text-paper">
      <div className="shell py-20 md:py-28">
        <p className="font-mono text-[11.5px] uppercase tracking-[0.14em] text-mist/75 flex items-center gap-3"><span className="h-px w-8 bg-sage" aria-hidden />Contact</p>
        <Reveal>
          <h2 id="contact-title" className="mt-5 max-w-[18ch] font-display text-[clamp(2.4rem,6vw,4.6rem)] font-semibold leading-[0.98] tracking-tightest">
            Have a project in mind? <span className="text-sage">Let’s talk.</span>
          </h2>
        </Reveal>
        <p className="mt-6 max-w-[52ch] text-[17px] leading-relaxed text-mist/75">Call or message me on WhatsApp. That’s the fastest way to reach me. You can also send a message with the form.</p>

        <div className="mt-12 grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <a href={site.phone.tel} className="group flex items-center justify-between gap-4 rounded-2xl bg-sage p-5 text-ink transition-colors hover:bg-paper" data-cta="phone">
                <span className="flex items-center gap-4"><span className="grid h-11 w-11 place-items-center rounded-full bg-ink text-sage"><Phone size={18} aria-hidden /></span>
                  <span><span className="block font-mono text-[11.5px] uppercase tracking-[0.12em] text-ink/85">Call</span><span className="block font-display text-[19px] font-semibold">{site.phone.display}</span></span></span>
                <ArrowUpRight size={18} aria-hidden className="shrink-0" />
              </a>
              <a href={site.whatsapp} target="_blank" rel="noopener noreferrer" className="group flex items-center justify-between gap-4 rounded-2xl border border-white/15 p-5 transition-colors hover:border-sage" data-cta="whatsapp">
                <span className="flex items-center gap-4"><span className="grid h-11 w-11 place-items-center rounded-full bg-fern text-ink"><MessageCircle size={18} aria-hidden /></span>
                  <span><span className="block font-mono text-[11.5px] uppercase tracking-[0.12em] text-mist/75">WhatsApp</span><span className="block font-display text-[19px] font-semibold">Message me</span></span></span>
                <ArrowUpRight size={18} aria-hidden className="shrink-0 text-mist/75 group-hover:text-sage" />
              </a>
            </div>
            <ul className="mt-8 divide-y divide-white/10 border-y border-white/10">
              <li><a href={site.maps} target="_blank" rel="noopener noreferrer" className="group flex items-start justify-between gap-4 py-4">
                <span className="flex gap-3"><MapPin size={18} className="mt-0.5 shrink-0 text-sage" aria-hidden /><span><span className="block font-mono text-[11.5px] uppercase tracking-[0.12em] text-mist/70">Location</span><span className="block text-[15.5px]">{site.location.full}</span></span></span>
                <ArrowUpRight size={16} className="mt-1 shrink-0 text-mist/70 group-hover:text-sage" aria-hidden /></a></li>
              <li><a href={`mailto:${site.email}`} className="group flex items-start justify-between gap-4 py-4">
                <span className="flex min-w-0 gap-3"><Mail size={18} className="mt-0.5 shrink-0 text-sage" aria-hidden /><span className="min-w-0"><span className="block font-mono text-[11.5px] uppercase tracking-[0.12em] text-mist/70">Email</span><span className="block truncate text-[15.5px]">{site.email}</span></span></span>
                <ArrowUpRight size={16} className="mt-1 shrink-0 text-mist/70 group-hover:text-sage" aria-hidden /></a></li>
              <li><a href={site.github.url} target="_blank" rel="noopener noreferrer" className="group flex items-start justify-between gap-4 py-4">
                <span className="flex gap-3"><Github size={18} className="mt-0.5 shrink-0 text-sage" aria-hidden /><span><span className="block font-mono text-[11.5px] uppercase tracking-[0.12em] text-mist/70">GitHub</span><span className="block text-[15.5px]">@{site.github.user}</span></span></span>
                <ArrowUpRight size={16} className="mt-1 shrink-0 text-mist/70 group-hover:text-sage" aria-hidden /></a></li>
            </ul>
          </div>

          <div className="lg:col-span-7">
            {status === "sent" ? (
              <div className="rounded-[20px] border border-white/15 p-8" role="status">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-sage text-ink"><Check size={22} aria-hidden /></span>
                <p className="mt-5 font-display text-[26px] font-semibold">Message sent. Thank you!</p>
                <p className="mt-2 text-mist/75">I’ll reply by email. For anything urgent, call or WhatsApp {site.phone.display}.</p>
              </div>
            ) : (
              <form onSubmit={onSubmit} noValidate className="relative rounded-[20px] border border-white/15 p-6 sm:p-8" aria-label="Contact form">
                <p className="font-display text-[22px] font-semibold">Send a message</p>
                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="name" className="mb-2 block text-[14px] text-mist/80">Your name</label>
                    <input id="name" name="name" autoComplete="name" className={field} aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-err" : undefined} />
                    {err("name")}
                  </div>
                  <div>
                    <label htmlFor="email" className="mb-2 block text-[14px] text-mist/80">Email</label>
                    <input id="email" name="email" type="email" autoComplete="email" inputMode="email" className={field} aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-err" : undefined} />
                    {err("email")}
                  </div>
                </div>
                <div className="mt-5">
                  <label htmlFor="subject" className="mb-2 block text-[14px] text-mist/80">Subject <span className="text-mist/70">(optional)</span></label>
                  <input id="subject" name="subject" className={field} aria-invalid={!!errors.subject} aria-describedby={errors.subject ? "subject-err" : undefined} />
                  {err("subject")}
                </div>
                <div className="mt-5">
                  <label htmlFor="message" className="mb-2 block text-[14px] text-mist/80">Message</label>
                  <textarea id="message" name="message" rows={5} className={`${field} resize-y`} aria-invalid={!!errors.message} aria-describedby={errors.message ? "message-err" : undefined} />
                  {err("message")}
                </div>
                <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden>
                  <label htmlFor="website">Website</label><input id="website" name="website" tabIndex={-1} autoComplete="off" />
                </div>
                <div className="mt-7 flex flex-wrap items-center gap-4">
                  <button type="submit" disabled={status === "sending"} className="btn bg-sage text-ink hover:bg-paper disabled:opacity-60 focus-visible:ring-sage focus-visible:ring-offset-ink">
                    {status === "sending" ? <><Loader2 size={17} className="animate-spin" aria-hidden />Sending…</> : <>Send message<ArrowUpRight size={17} aria-hidden /></>}
                  </button>
                  {status === "error" ? <p className="text-[14px] text-sage" role="alert">{note}</p> : null}
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
