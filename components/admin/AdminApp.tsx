"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Archive, Download, Loader2, LogOut, Mail, MessageCircle, Phone, RefreshCw, RotateCcw, Search, Trash2 } from "lucide-react";
import { STATUSES, STATUS_LABEL, type Status } from "@/lib/request-schema";
import { Signature } from "../Signature";

declare global { interface Window { Clerk?: any } }
const PK = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "";
const FAPI = process.env.NEXT_PUBLIC_CLERK_FRONTEND_API || "";

type Row = Record<string, any>;
const when = (ms?: number | null) => (ms ? new Date(ms).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kathmandu" }) : "—");
const badge: Record<string, string> = {
  received: "bg-teal/10 text-teal", under_review: "bg-[#E8EEE9] text-ink", in_discussion: "bg-[#E6EEF3] text-[#244A63]", approved: "bg-[#E3F1E7] text-[#1E6B3A]",
  in_development: "bg-ink text-paper", completed: "bg-fern text-white", cancelled: "bg-mist text-muted",
};
const input = "w-full rounded-xl border border-ink/15 bg-white px-3.5 py-2.5 text-[15px] text-ink focus:border-teal focus:outline-none";

function loadClerk(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (window.Clerk) return resolve(window.Clerk);
    const s = document.createElement("script");
    s.src = `${FAPI}/npm/@clerk/clerk-js@5/dist/clerk.browser.js`;
    s.async = true; s.crossOrigin = "anonymous";
    s.setAttribute("data-clerk-publishable-key", PK);
    s.onload = () => (window.Clerk ? resolve(window.Clerk) : reject(new Error("Clerk did not load")));
    s.onerror = () => reject(new Error("Couldn’t load the sign-in script"));
    document.head.appendChild(s);
  });
}

export function AdminApp() {
  const [phase, setPhase] = useState<"loading" | "signin" | "denied" | "ready" | "error">("loading");
  const [msg, setMsg] = useState("");
  const [me, setMe] = useState("");
  const clerk = useRef<any>(null);
  const signInEl = useRef<HTMLDivElement>(null);

  const api = useCallback(async (path: string, init: RequestInit = {}) => {
    const token = await clerk.current?.session?.getToken();
    const r = await fetch(`/api/admin${path}`, { ...init, headers: { ...(init.headers || {}), authorization: `Bearer ${token}`, ...(init.body ? { "content-type": "application/json" } : {}) } });
    if (r.status === 401) { setPhase("denied"); throw new Error("unauthorized"); }
    return r;
  }, []);

  useEffect(() => {
    let off = false;
    (async () => {
      try {
        const C = await loadClerk();
        await C.load();
        clerk.current = C;
        if (off) return;
        if (!C.user) { setPhase("signin"); return; }
        const r = await api("/me");
        const b = await r.json().catch(() => ({}));
        if (r.ok && b.ok) { setMe(b.email); setPhase("ready"); } else setPhase("denied");
      } catch (e) { if (!off && (e as Error).message !== "unauthorized") { setMsg((e as Error).message); setPhase("error"); } }
    })();
    return () => { off = true; };
  }, [api]);

  useEffect(() => {
    if (phase === "signin" && signInEl.current && clerk.current) {
      clerk.current.mountSignIn(signInEl.current, { routing: "hash", forceRedirectUrl: "/admin", signUpForceRedirectUrl: "/admin", appearance: { variables: { colorPrimary: "#216869", fontFamily: "inherit", borderRadius: "12px" } } });
      return () => { try { clerk.current?.unmountSignIn(signInEl.current); } catch { /* already gone */ } };
    }
  }, [phase]);

  const signOut = async () => { await clerk.current?.signOut(); location.href = "/admin"; };

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-40 border-b border-mist bg-paper/95 backdrop-blur-[2px]">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6">
          <a href="/" className="flex items-center gap-3" aria-label="Back to the portfolio"><Signature className="w-[46px]" /><span className="hidden h-6 w-px bg-teal/50 sm:block" aria-hidden /><span className="hidden font-display text-[15px] font-semibold sm:block">Requests dashboard</span></a>
          {phase === "ready" || phase === "denied" ? (
            <div className="flex items-center gap-3 text-[13.5px] text-muted"><span className="hidden truncate sm:inline">{me}</span>
              <button type="button" onClick={signOut} className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-ink/15 px-4 text-ink hover:border-ink/40"><LogOut size={15} aria-hidden />Sign out</button></div>
          ) : null}
        </div>
      </header>
      <main id="main" className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
        {phase === "loading" ? <p className="flex items-center gap-2 text-muted"><Loader2 size={16} className="animate-spin" aria-hidden />Loading…</p> : null}
        {phase === "error" ? <p role="alert" className="text-[15px]">Couldn’t start sign-in: {msg}. Reload the page to try again.</p> : null}
        {phase === "signin" ? (
          <div className="mx-auto max-w-md py-6">
            <h1 className="font-display text-[30px] font-semibold tracking-tight">Owner sign-in</h1>
            <p className="mt-2 text-[15px] text-muted">The website requests dashboard is only for Nabin. Sign in with Google as nabinuranw333@gmail.com.</p>
            <div ref={signInEl} className="mt-6" />
          </div>
        ) : null}
        {phase === "denied" ? (
          <div className="mx-auto max-w-md py-10">
            <h1 className="font-display text-[28px] font-semibold tracking-tight">This account isn’t the owner.</h1>
            <p className="mt-3 text-[15px] text-muted">Only Nabin’s account can open the requests dashboard. Sign out and sign in with nabinuranw333@gmail.com.</p>
            <button type="button" onClick={signOut} className="btn-primary mt-6">Sign out</button>
          </div>
        ) : null}
        {phase === "ready" ? <Dashboard api={api} /> : null}
      </main>
    </div>
  );
}

function Dashboard({ api }: { api: (p: string, i?: RequestInit) => Promise<Response> }) {
  const [list, setList] = useState<Row[] | null>(null);
  const [counts, setCounts] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [view, setView] = useState("active");
  const [sel, setSel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    const p = new URLSearchParams({ view }); if (q.trim()) p.set("q", q.trim()); if (status) p.set("status", status);
    try { const r = await api(`/requests?${p}`); const b = await r.json(); if (b.ok) { setList(b.requests); setCounts(b.counts); } } catch { /* handled by api */ }
    setBusy(false);
  }, [api, q, status, view]);

  useEffect(() => { const id = new URLSearchParams(location.search).get("id"); if (id) setSel(id.toUpperCase()); }, []);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  const open = (id: string | null) => { setSel(id); const u = new URL(location.href); if (id) u.searchParams.set("id", id); else u.searchParams.delete("id"); history.replaceState(null, "", u); };

  const countFor = (s: string) => counts.filter((c) => (view === "all" || (view === "archived" ? c.archived : !c.archived)) && (!s || c.status === s)).reduce((a, c) => a + c.n, 0);

  const exportCsv = async () => {
    const r = await api("/export.csv"); const blob = await r.blob();
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `website-requests-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <section aria-labelledby="list-title" className={`min-w-0 ${sel ? "hidden lg:block" : ""}`}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 id="list-title" className="font-display text-[30px] font-semibold tracking-tight">Website requests</h1>
          <div className="flex gap-2">
            <button type="button" onClick={load} className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-ink/15 bg-white px-4 text-[14px] hover:border-ink/40" aria-label="Refresh"><RefreshCw size={15} className={busy ? "animate-spin" : ""} aria-hidden />Refresh</button>
            <button type="button" onClick={exportCsv} className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-ink/15 bg-white px-4 text-[14px] hover:border-ink/40"><Download size={15} aria-hidden />Export CSV</button>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className="relative block"><span className="sr-only">Search requests</span>
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ID, name, email, type…" className={`${input} pl-10`} /></label>
          <label className="block"><span className="sr-only">Show</span>
            <select value={view} onChange={(e) => setView(e.target.value)} className={input}><option value="active">Active</option><option value="archived">Archived</option><option value="all">All</option></select></label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter by status">
          {["", ...STATUSES].map((s) => (
            <button key={s || "all"} type="button" onClick={() => setStatus(s)} aria-pressed={status === s}
              className={`min-h-[36px] rounded-full border px-3.5 text-[13.5px] ${status === s ? "border-ink bg-ink text-paper" : "border-ink/15 bg-white text-ink/80 hover:border-ink/40"}`}>
              {s ? STATUS_LABEL[s as Status] : "All"} <span className="opacity-60">{countFor(s)}</span>
            </button>
          ))}
        </div>
        <div className="mt-5 overflow-hidden rounded-2xl border border-mist bg-white">
          {list === null ? <p className="p-6 text-muted">Loading…</p> : list.length === 0 ? <p className="p-6 text-muted">No requests match.</p> : (
            <ul className="divide-y divide-mist">
              {list.map((r) => (
                <li key={r.id}>
                  <button type="button" onClick={() => open(r.id)} aria-current={sel === r.id ? "true" : undefined} className={`grid w-full gap-1 px-4 py-3.5 text-left hover:bg-paper ${sel === r.id ? "bg-paper" : ""}`}>
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-[13.5px] font-medium">{r.id}{r.is_test ? <span className="ml-2 rounded bg-[#FFF1D6] px-1.5 py-0.5 font-sans text-[11px] text-[#7A5200]">TEST</span> : null}{r.archived ? <span className="ml-2 rounded bg-mist px-1.5 py-0.5 font-sans text-[11px] text-muted">Archived</span> : null}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-medium ${badge[r.status] || ""}`}>{STATUS_LABEL[r.status as Status]}</span>
                    </span>
                    <span className="truncate text-[15px] font-medium">{r.name}{r.organization ? <span className="font-normal text-muted"> · {r.organization}</span> : null}</span>
                    <span className="flex flex-wrap gap-x-3 text-[13px] text-muted"><span>{r.website_type}</span><span>{r.budget}</span><span>{when(r.created_at)}</span>{r.mail_failed ? <span className="text-[#A3361F]">email failed</span> : null}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      <section aria-label="Request detail" className={`min-w-0 ${sel ? "" : "hidden lg:block"}`}>
        {sel ? <Detail key={sel} id={sel} api={api} onBack={() => open(null)} onChanged={load} /> : <div className="grid h-full min-h-[300px] place-items-center rounded-2xl border border-dashed border-mist text-muted">Select a request</div>}
      </section>
    </div>
  );
}

function Detail({ id, api, onBack, onChanged }: { id: string; api: (p: string, i?: RequestInit) => Promise<Response>; onBack: () => void; onChanged: () => void }) {
  const [d, setD] = useState<Row | null>(null);
  const [err, setErr] = useState("");
  const [st, setSt] = useState<Status>("received");
  const [stMsg, setStMsg] = useState("");
  const [notify, setNotify] = useState(true);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [noteKind, setNoteKind] = useState<"note" | "message">("note");
  const [noteNotify, setNoteNotify] = useState(false);
  const [flash, setFlash] = useState("");
  const [working, setWorking] = useState("");
  const [confirmDel, setConfirmDel] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await api(`/requests/${encodeURIComponent(id)}`); const b = await r.json();
      if (!b.ok) { setErr(r.status === 404 ? "This request doesn’t exist (it may have been deleted)." : b.error); return; }
      setD(b); setSt(b.request.status); setTitle(b.request.title || "");
    } catch { /* api handles 401 */ }
  }, [api, id]);
  useEffect(() => { load(); }, [load]);
  const say = (s: string) => { setFlash(s); setTimeout(() => setFlash(""), 4000); };
  const mailWord = (e: Row | null) => (e ? (e.status === "sent" ? "email sent" : `email ${e.status}: ${e.last_error || ""}`) : "");

  async function patch(body: Row, label: string) {
    setWorking(label);
    try { const r = await api(`/requests/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) }); const b = await r.json();
      say(b.ok ? `Saved${b.email ? ` · ${mailWord(b.email)}` : ""}` : `Couldn’t save: ${b.error}`); await load(); onChanged(); } catch { /* */ }
    setWorking("");
  }
  async function addEvent() {
    if (!note.trim()) return;
    setWorking("event");
    try { const r = await api(`/requests/${encodeURIComponent(id)}/events`, { method: "POST", body: JSON.stringify({ kind: noteKind, body: note, notify: noteKind === "message" && noteNotify }) }); const b = await r.json();
      if (b.ok) { setNote(""); say(`${noteKind === "message" ? "Message added" : "Note saved"}${b.email ? ` · ${mailWord(b.email)}` : ""}`); } else say(`Couldn’t save: ${b.error}`); await load(); } catch { /* */ }
    setWorking("");
  }
  async function resend(logId: number) {
    setWorking(`mail${logId}`);
    try { const r = await api(`/requests/${encodeURIComponent(id)}/emails/${logId}/resend`, { method: "POST" }); const b = await r.json(); say(b.ok ? mailWord(b.email) : b.error); await load(); } catch { /* */ }
    setWorking("");
  }
  async function del() {
    setWorking("delete");
    try { const r = await api(`/requests/${encodeURIComponent(id)}`, { method: "DELETE", body: JSON.stringify({ confirm: confirmDel.trim().toUpperCase() }) }); const b = await r.json();
      if (b.ok) { onChanged(); onBack(); } else say("Type the request ID exactly to delete it."); } catch { /* */ }
    setWorking("");
  }

  if (err) return <div className="rounded-2xl border border-mist bg-white p-6"><button type="button" onClick={onBack} className="mb-4 inline-flex items-center gap-2 text-[14px] text-teal"><ArrowLeft size={15} aria-hidden />All requests</button><p>{err}</p></div>;
  if (!d) return <p className="flex items-center gap-2 text-muted"><Loader2 size={16} className="animate-spin" aria-hidden />Loading {id}…</p>;
  const r = d.request;
  const phone = `${r.country_code}${r.phone}`.replace(/[^\d+]/g, "");
  const fields: [string, string][] = [
    ["Name", r.name], ["Business / organization", r.organization], ["Email", r.email], ["Phone / WhatsApp", `${r.country_code} ${r.phone}`],
    ["Website type", r.website_type], ["Project description", r.description], ["Required features", r.features], ["Budget", r.budget],
    ["Preferred completion", r.completion], ["Existing website", r.existing_url], ["Websites they like", r.reference_sites], ["What they like", r.reference_notes],
    ["Submitted", `${when(r.created_at)} NPT`], ["Country (from network)", r.country || ""],
  ];

  return (
    <article className="min-w-0 rounded-2xl border border-mist bg-white">
      <div className="border-b border-mist p-5 sm:p-6">
        <button type="button" onClick={onBack} className="mb-4 inline-flex min-h-[36px] items-center gap-2 text-[14px] text-teal lg:hidden"><ArrowLeft size={15} aria-hidden />All requests</button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[13px] text-muted">{r.id}{r.is_test ? " · TEST" : ""}{r.archived ? " · Archived" : ""}</p>
            <h2 className="mt-1 font-display text-[26px] font-semibold leading-tight tracking-tight">{r.project}</h2>
          </div>
          <span className={`rounded-full px-3 py-1 text-[13px] font-medium ${badge[r.status] || ""}`}>{STATUS_LABEL[r.status as Status]}</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-[14px]">
          <a href={`mailto:${r.email}?subject=${encodeURIComponent(`Your website request ${r.id}`)}`} className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-ink/15 px-4 hover:border-ink/40"><Mail size={15} aria-hidden />Email</a>
          <a href={`tel:${phone}`} className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-ink/15 px-4 hover:border-ink/40"><Phone size={15} aria-hidden />Call</a>
          <a href={`https://wa.me/${phone.replace("+", "")}?text=${encodeURIComponent(`Hello ${r.name}, this is Nabin about your website request ${r.id}.`)}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-ink/15 px-4 hover:border-ink/40"><MessageCircle size={15} aria-hidden />WhatsApp</a>
          {d.pdfUrl ? <a href={d.pdfUrl} className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-ink/15 px-4 hover:border-ink/40"><Download size={15} aria-hidden />PDF</a> : null}
        </div>
        {flash ? <p role="status" className="mt-4 rounded-xl bg-paper px-4 py-2.5 text-[14px]">{flash}</p> : null}
      </div>

      <div className="grid grid-cols-1 gap-0 divide-y divide-mist">
        <form className="grid gap-3 p-5 sm:p-6" onSubmit={(e) => { e.preventDefault(); patch({ status: st, message: stMsg, notify }, "status").then(() => setStMsg("")); }}>
          <h3 className="font-display text-[18px] font-semibold">Update status</h3>
          <label className="block"><span className="mb-1.5 block text-[13.5px] text-muted">Status</span>
            <select value={st} onChange={(e) => setSt(e.target.value as Status)} className={input}>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></label>
          <label className="block"><span className="mb-1.5 block text-[13.5px] text-muted">Message to the customer (optional, shown on their status page)</span>
            <textarea value={stMsg} onChange={(e) => setStMsg(e.target.value)} rows={2} className={input} placeholder="e.g. Thanks! I’ll call you tomorrow to discuss the details." /></label>
          <label className="inline-flex items-center gap-2.5 text-[14.5px]"><input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="h-4 w-4 accent-[#216869]" />Email the customer about this update</label>
          <div><button type="submit" disabled={!!working || (st === r.status && !stMsg.trim())} className="btn-primary min-h-[42px] px-5 text-[14px] disabled:opacity-50">{working === "status" ? <Loader2 size={15} className="animate-spin" aria-hidden /> : null}Save status</button></div>
        </form>

        <div className="p-5 sm:p-6">
          <h3 className="font-display text-[18px] font-semibold">Project details</h3>
          <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); patch({ title }, "title"); }}>
            <label className="min-w-0 flex-1"><span className="sr-only">Project name</span><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`Project name (default: ${r.website_type}${r.organization ? ` for ${r.organization}` : ""})`} className={input} /></label>
            <button type="submit" className="shrink-0 rounded-xl border border-ink/15 px-4 text-[14px] hover:border-ink/40">Rename</button>
          </form>
          <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-[180px_minmax(0,1fr)]">
            {fields.map(([k, v]) => (<div key={k} className="contents"><dt className="text-[13.5px] text-muted">{k}</dt><dd className="whitespace-pre-line break-words text-[15px]">{v || <span className="text-muted">—</span>}</dd></div>))}
          </dl>
        </div>

        <div className="p-5 sm:p-6">
          <h3 className="font-display text-[18px] font-semibold">Timeline, notes &amp; messages</h3>
          <ol className="mt-3 space-y-2.5">
            {d.events.map((e: Row) => (
              <li key={e.id} className={`rounded-xl px-3.5 py-2.5 text-[14.5px] ${e.kind === "note" ? "bg-[#FFF8E8]" : e.kind === "message" ? "bg-[#EEF5F0]" : "bg-paper"}`}>
                <p className="flex flex-wrap gap-x-2 text-[12.5px] text-muted"><span className="font-medium uppercase tracking-wide">{e.kind === "note" ? "Internal note" : e.kind === "message" ? "Customer message" : e.kind === "status" ? "Status" : "System"}</span><span>{when(e.at)}</span>{e.visible ? <span>· visible to customer</span> : <span>· private</span>}</p>
                <p className="mt-1 whitespace-pre-line">{e.body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-4 grid gap-2.5">
            <div className="flex gap-2" role="radiogroup" aria-label="Type">
              {(["note", "message"] as const).map((k) => (
                <button key={k} type="button" role="radio" aria-checked={noteKind === k} onClick={() => setNoteKind(k)} className={`min-h-[36px] rounded-full border px-3.5 text-[13.5px] ${noteKind === k ? "border-ink bg-ink text-paper" : "border-ink/15"}`}>{k === "note" ? "Internal note" : "Customer-visible message"}</button>
              ))}
            </div>
            <label><span className="sr-only">{noteKind === "note" ? "Internal note" : "Message to the customer"}</span>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={input} placeholder={noteKind === "note" ? "Only you can see this" : "Shown on the customer’s status page"} /></label>
            {noteKind === "message" ? <label className="inline-flex items-center gap-2.5 text-[14.5px]"><input type="checkbox" checked={noteNotify} onChange={(e) => setNoteNotify(e.target.checked)} className="h-4 w-4 accent-[#216869]" />Also email it to the customer</label> : null}
            <div><button type="button" onClick={addEvent} disabled={!note.trim() || !!working} className="rounded-full border border-ink/15 px-4 py-2 text-[14px] hover:border-ink/40 disabled:opacity-50">Add {noteKind === "note" ? "note" : "message"}</button></div>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <h3 className="font-display text-[18px] font-semibold">Email log</h3>
          <p className="mt-1 text-[13px] text-muted">Provider: EmailJS. “sent” means EmailJS accepted it. Failed emails retry automatically (2, 10, 30, 120, 360 min) when the site gets traffic; you can also resend.</p>
          <ul className="mt-3 divide-y divide-mist rounded-xl border border-mist">
            {d.emails.length === 0 ? <li className="p-3 text-[14px] text-muted">No emails yet.</li> : d.emails.map((e: Row) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-[14px]">
                <span className="min-w-0"><span className="font-medium">{e.kind === "owner_alert" ? "Alert to you" : e.kind === "customer_confirmation" ? "Customer confirmation" : "Status update"}</span>
                  <span className="block truncate text-[12.5px] text-muted">{e.to_addr} · {when(e.updated_at)} · {e.attempts} attempt{e.attempts === 1 ? "" : "s"}{e.last_error ? ` · ${e.last_error}` : ""}</span></span>
                <span className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-[12px] ${e.status === "sent" ? "bg-[#E3F1E7] text-[#1E6B3A]" : e.status === "pending" ? "bg-mist" : "bg-[#FBE7E2] text-[#A3361F]"}`}>{e.status}</span>
                  <button type="button" onClick={() => resend(e.id)} disabled={!!working} className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full border border-ink/15 px-3 text-[13px] hover:border-ink/40"><RotateCcw size={13} aria-hidden />{e.status === "sent" ? "Send again" : "Resend"}</button>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap items-center gap-3 p-5 sm:p-6">
          <button type="button" onClick={() => patch({ archived: !r.archived }, "archive")} className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-ink/15 px-4 text-[14px] hover:border-ink/40"><Archive size={15} aria-hidden />{r.archived ? "Restore from archive" : "Archive"}</button>
          <button type="button" onClick={() => patch({ is_test: !r.is_test }, "test")} className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-ink/15 px-4 text-[14px] hover:border-ink/40">{r.is_test ? "Unmark test" : "Mark as test"}</button>
          <span className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
            <label className="min-w-0 flex-1 sm:flex-none"><span className="sr-only">Type the request ID to delete</span><input value={confirmDel} onChange={(e) => setConfirmDel(e.target.value)} placeholder={`Type ${r.id} to delete`} className={`${input} w-full py-2 text-[13.5px] sm:w-[200px]`} /></label>
            <button type="button" onClick={del} disabled={confirmDel.trim().toUpperCase() !== r.id || !!working} className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-[#A3361F] px-4 text-[14px] text-white disabled:opacity-40"><Trash2 size={15} aria-hidden />Delete</button>
          </span>
        </div>
      </div>
    </article>
  );
}
