import { z } from "zod";
// "Request a Website": shared by the browser form (per-step checks) and the Worker API (the authority).

export const WEBSITE_TYPES = [
  "Business Website", "E-commerce Website", "Portfolio Website", "Restaurant Website", "School Website",
  "Blog / News Website", "Web Application", "Landing Page", "Custom Website", "Other",
] as const;

export const BUDGETS = [
  "Under NPR 25,000", "NPR 25,000 – 50,000", "NPR 50,000 – 1,00,000", "NPR 1,00,000 – 2,50,000", "Above NPR 2,50,000", "Not sure yet",
] as const;

export const STATUSES = ["received", "under_review", "in_discussion", "approved", "in_development", "completed", "cancelled"] as const;
export type Status = (typeof STATUSES)[number];
export const STATUS_LABEL: Record<Status, string> = {
  received: "Received", under_review: "Under Review", in_discussion: "In Discussion", approved: "Approved",
  in_development: "In Development", completed: "Completed", cancelled: "Cancelled",
};
/** The linear path a request normally follows (Cancelled can happen at any point). */
export const STATUS_PATH: Status[] = ["received", "under_review", "in_discussion", "approved", "in_development", "completed"];

export const COUNTRY_CODES = [
  { code: "+977", label: "Nepal" }, { code: "+91", label: "India" }, { code: "+880", label: "Bangladesh" }, { code: "+975", label: "Bhutan" },
  { code: "+86", label: "China" }, { code: "+971", label: "UAE" }, { code: "+974", label: "Qatar" }, { code: "+966", label: "Saudi Arabia" },
  { code: "+965", label: "Kuwait" }, { code: "+968", label: "Oman" }, { code: "+973", label: "Bahrain" }, { code: "+60", label: "Malaysia" },
  { code: "+81", label: "Japan" }, { code: "+82", label: "South Korea" }, { code: "+61", label: "Australia" }, { code: "+64", label: "New Zealand" },
  { code: "+44", label: "United Kingdom" }, { code: "+1", label: "USA / Canada" }, { code: "+49", label: "Germany" }, { code: "+33", label: "France" },
] as const;
const CODES = COUNTRY_CODES.map((c) => c.code) as unknown as [string, ...string[]];

const ctrl = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const text = (max: number) => z.string().transform((s) => s.replace(ctrl, "").trim()).pipe(z.string().max(max, `Please keep this under ${max} characters`));

const urlish = z.string().transform((s) => s.replace(ctrl, "").trim()).pipe(z.string().max(300, "That link is too long"))
  .refine((s) => s === "" || /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(:\d+)?(\/\S*)?$/i.test(s), "Please enter a web address, like example.com")
  .transform((s) => (s && !/^https?:\/\//i.test(s) ? `https://${s}` : s));

export const stepAbout = z.object({
  name: text(80).pipe(z.string().min(2, "Please enter your name")),
  organization: text(120),
  email: z.string().trim().toLowerCase().max(160).email("Please enter a valid email address"),
  countryCode: z.enum(CODES, { errorMap: () => ({ message: "Choose a country code" }) }),
  phone: z.string().transform((s) => s.replace(/[\s()-]/g, "")).pipe(z.string().regex(/^\d{6,14}$/, "Enter the number with digits only, like 98XXXXXXXX")),
}).superRefine((v, ctx) => {
  if (v.countryCode === "+977" && !/^(9[678]\d{8}|0?\d{6,9})$/.test(v.phone))
    ctx.addIssue({ code: "custom", path: ["phone"], message: "A Nepal mobile number has 10 digits, like 98XXXXXXXX" });
});

export const stepProject = z.object({
  websiteType: z.enum(WEBSITE_TYPES, { errorMap: () => ({ message: "Choose the kind of website" }) }),
  description: text(4000).pipe(z.string().min(20, "Tell me a little more (at least 20 characters)")),
  features: text(3000),
});

export const stepBudget = z.object({
  budget: z.enum(BUDGETS, { errorMap: () => ({ message: "Choose a budget range (or “Not sure yet”)" }) }),
  flexible: z.boolean(),
  completionDate: z.string().trim().max(10),
}).superRefine((v, ctx) => {
  if (v.flexible) return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.completionDate)) { ctx.addIssue({ code: "custom", path: ["completionDate"], message: "Pick a date, or choose “I’m flexible”" }); return; }
  const d = Date.parse(v.completionDate + "T00:00:00Z");
  const today = Date.parse(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
  if (!Number.isFinite(d) || d < today - 86400000) ctx.addIssue({ code: "custom", path: ["completionDate"], message: "Choose a date from today onwards" });
  else if (d > today + 3 * 365 * 86400000) ctx.addIssue({ code: "custom", path: ["completionDate"], message: "Choose a date within the next three years" });
});

export const stepRefs = z.object({
  existingUrl: urlish,
  referenceSites: text(1000),
  referenceNotes: text(2000),
});

export const requestSchema = z.object({
  about: stepAbout, project: stepProject, budget: stepBudget, refs: stepRefs,
  website: z.string().max(0).optional().default(""),          // honeypot: humans never see it
  elapsedMs: z.number().int().nonnegative().optional().default(0), // time-trap
});
export type RequestInput = z.infer<typeof requestSchema>;

export const statusLookupSchema = z.object({
  id: z.string().trim().toUpperCase().regex(/^NBR-\d{4}-[A-Z0-9]{4}$/, "Request IDs look like NBR-2026-AB12"),
  email: z.string().trim().toLowerCase().email("Please enter the email you used"),
});

export const WHATSAPP_NUMBER = "9779764465688";
export function whatsappText(id: string, name: string, websiteType: string) {
  return `Hello Nabin,\n\nI have submitted a website development request through your portfolio.\n\nRequest ID: ${id}\nName: ${name}\nWebsite Type: ${websiteType}\n\nI am sending my project requirements PDF below.\n\nPlease review my requirements and let me know the next steps.`;
}
export const whatsappLink = (id: string, name: string, websiteType: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappText(id, name, websiteType))}`;
