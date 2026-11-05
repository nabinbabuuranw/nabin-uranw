# Request a Website — how it works

Live: https://nabin-uranw.sites.tab.bot/#request · status: /status · admin: /admin · privacy: /privacy

## Flow
1. The visitor fills a 4-step form (About you → The project → Budget & timing → References). Each step is checked in the browser with the same Zod schema the server uses (`lib/request-schema.ts`).
2. `POST /api/requests` (Cloudflare Worker, `worker/requests.ts`):
   - same-origin + JSON + size checks, hidden honeypot field, time-trap (under 4 s is refused);
   - Zod validation (the server is the authority);
   - **duplicate prevention**: same email + same description (hashed) within 10 minutes returns the existing ID, no new emails;
   - rate limits: 5 / hour per visitor (salted IP hash, never the IP), 3 / day per email, 60 / hour site-wide;
   - **saved first** in the site's D1 database (`wr_requests`), ID `NBR-YYYY-XXXX`;
   - a PDF is generated on the server (pdf-lib, `worker/pdf.ts`) and stored with the request;
   - two emails are queued in the email log (`wr_emails`) and sent in the background.
3. The confirmation screen shows the ID, **Download Project PDF** (a signed link valid 30 days, served with `Content-Disposition: attachment; filename="Website-Request-<ID>.pdf"`), **Send Request via WhatsApp** (wa.me/9779764465688 with the prefilled message) and **Track Your Request**.
4. `/status`: ID + email must both match (one generic error otherwise, rate limited 20 / 10 min). Shows project, status, last updated, the progress timeline, customer-visible messages, "Download PDF again".

## Statuses
Received → Under Review → In Discussion → Approved → In Development → Completed, plus Cancelled. Every change is logged with its time.

## Emails (EmailJS, free plan)
- Alert to nabinuranw333@gmail.com: subject `[NEW WEBSITE REQUEST] — <ID> — <Name>`, every field, submission date/time (Nepal time), a button to the request in /admin, and a signed 30-day PDF link. Reply-To is the customer.
- Confirmation to the customer: thank-you, ID, summary, next step, tracking link, contact details. Reply-To is Nabin.
- Status updates to the customer when you tick "Email the customer" in /admin.
- An email is marked **sent** only when EmailJS answers 200. Failures are retried automatically after 2, 10, 30, 120 and 360 minutes (the retry runs on the site's own API traffic: hosting has no cron), then marked `gave_up`. /admin shows provider, status, attempts and the last error for each email, with a Resend button.
- **PDF attachment**: EmailJS's free plan accepts the attachment setting but drops the file. On the Personal plan ($9/month, 500 KB attachments) set `EMAILJS_ATTACH_PDF=1` and rebuild: the template already has the variable attachment `pdf_attachment` / `{{pdf_name}}`. Until then the alert carries the signed PDF link.
- Free plan: 200 emails/month shared with nabinbabuuranw.sites.tab.bot; each request uses 2.

## Admin
/admin → Clerk sign-in (Google) → the Worker verifies the Clerk session token (RS256 against Clerk's JWKS, issuer, expiry) and then re-reads the user from Clerk's Backend API: the **verified** primary email must be in `ADMIN_EMAILS` (nabinuranw333@gmail.com) or `publicMetadata.role` must be `admin`. Everything else gets 401.
List (search by ID, name, email, type, organization; status filter with counts; Active / Archived / All), detail, status update with optional customer message + email, internal notes, customer-visible messages, email log + resend, PDF, rename project, mark as test, archive/restore, delete (type the ID), CSV export.

## Configuration (build-time env, baked into the Worker bundle; the Worker script is never served)
| Variable | What |
|---|---|
| `REQ_HMAC_SECRET` | 24+ random chars; signs PDF links |
| `REQ_IP_SALT` | random; salts the IP hash |
| `ADMIN_EMAILS` | comma-separated, default nabinuranw333@gmail.com |
| `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID`, `EMAILJS_PUBLIC_KEY`, `EMAILJS_PRIVATE_KEY` | EmailJS REST (private-key mode) |
| `EMAILJS_ATTACH_PDF` | `1` only on a paid EmailJS plan |
| `CLERK_FRONTEND_API`, `CLERK_SECRET_KEY` | Clerk instance (server) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_CLERK_FRONTEND_API` | Clerk (browser, public) |

Build: `npm run build` (needs `pdf-lib` installed). Storage: the `DB` D1 binding in `out/tab-site.json`; tables are created on first use (`wr_requests`, `wr_events`, `wr_emails`, `rate`).

## Remaining / limits
- Clerk app is a development instance (shared with nabinbabuuranw.sites.tab.bot, "Nabin Babu Uranw" in the NEXA Clerk workspace). For a custom domain, create a Clerk production instance and set its keys.
- PDFs use standard PDF fonts: Nepali (Devanagari) text shows as "?" in the PDF with a note; the original text is kept exactly in the database, admin and emails.
