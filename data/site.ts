// Every fact on this page comes from Nabin's own words (brief of 3 Nov 2026) or from his public GitHub.
export const site = {
  url: "https://nabinbabuuranw.com.np",
  name: "Nabin Babu Uranw",
  nameNative: "नवीन बाबु उराँव",
  role: "Independent Full-Stack Developer",
  roles: ["Web Developer", "UI/UX Designer", "Software Developer", "Digital Product Builder"],
  intro:
    "I design and develop modern websites, web applications, and digital products with a strong focus on functionality, performance, security, and user experience.",
  location: { short: "Inaruwa, Sunsari, Nepal", full: "Inaruwa, Sunsari, Koshi Province, Nepal", locality: "Inaruwa", region: "Koshi Province", district: "Sunsari", country: "NP" },
  maps: "https://www.google.com/maps/search/?api=1&query=Inaruwa%2C%20Sunsari%2C%20Nepal",
  phone: { display: "+977-9764465688", tel: "tel:+9779764465688", e164: "+9779764465688" },
  whatsapp: "https://wa.me/9779764465688",
  email: "nabinuranw333@gmail.com",
  github: { user: "nabinbabuuranw", url: "https://github.com/nabinbabuuranw" },
};

export const nav = [
  { id: "about", label: "About" },
  { id: "projects", label: "Projects" },
  { id: "skills", label: "Skills" },
  { id: "services", label: "Services" },
  { id: "process", label: "Process" },
  { id: "contact", label: "Contact" },
];

export const about = {
  lead: "I’m Nabin Babu Uranw, an independent full-stack developer based in Inaruwa, Sunsari, in Nepal’s Koshi Province.",
  body: [
    "I design, develop, build and maintain websites and software myself, from the first layout sketch and the database schema to deployment and the updates that come after launch.",
    "Most of what I build is practical software for real businesses: management systems, billing and receivables, appointment booking, and small tools people use every day, like a Bikram Sambat date converter.",
  ],
  principles: [
    { title: "Functionality first", body: "Every button, form and link has to work. A screen that looks finished but isn’t is not finished." },
    { title: "Performance", body: "Pages should load fast on an ordinary phone and a slow connection, not just on a desktop." },
    { title: "Security", body: "Validation on the server, sensible access control, and security headers as a default, not an add-on." },
    { title: "User experience", body: "Clear typography, honest states and layouts that hold up from 375 px to a wide screen." },
  ],
};

// "Seen in" for each skill is computed from public GitHub repos (language + topics), never hand-written.
export const skills: { group: string; items: { name: string; match?: string[] }[] }[] = [
  { group: "Frontend", items: [
    { name: "React", match: ["React"] }, { name: "Next.js", match: ["Next.js"] }, { name: "TypeScript", match: ["TypeScript"] },
    { name: "JavaScript", match: ["JavaScript"] }, { name: "Tailwind CSS", match: ["Tailwind CSS"] }, { name: "Vite", match: ["Vite"] },
    { name: "Framer Motion", match: ["Framer Motion"] },
  ] },
  { group: "Backend & data", items: [
    { name: "Node.js", match: ["Node.js"] }, { name: "REST APIs" }, { name: "Cloudflare Workers", match: ["Cloudflare Workers"] },
    { name: "Cloudflare D1", match: ["Cloudflare D1"] }, { name: "PostgreSQL", match: ["PostgreSQL"] }, { name: "Prisma", match: ["Prisma"] },
    { name: "Python", match: ["Python"] },
  ] },
  { group: "Auth, tooling & delivery", items: [
    { name: "Clerk authentication", match: ["Clerk"] }, { name: "Role-based access (RBAC)" }, { name: "Git & GitHub" },
    { name: "Docker", match: ["Docker"] }, { name: "SEO & Core Web Vitals" },
  ] },
  { group: "Design", items: [
    { name: "UI/UX design" }, { name: "Design systems & tokens" }, { name: "Responsive layouts" }, { name: "Accessible interfaces" },
  ] },
];

export const services = [
  { title: "Website Development", body: "Fast, accessible, search-ready websites for businesses, schools, restaurants and personal brands, designed and built end to end." },
  { title: "Full-Stack Web Applications", body: "Web apps with real sign-in, roles, databases and admin panels, built to be used every day, not just demoed." },
  { title: "Business Systems & SaaS", body: "Management, billing, booking and inventory software shaped around how a business in Nepal actually works: BS dates, VAT, local payments." },
  { title: "UI/UX Design", body: "Typography, colour systems and layouts that feel hand-made, prototyped and tested at every screen width before code." },
  { title: "API Integrations & Automation", body: "Connecting payment gateways, maps, email and third-party APIs, and automating the repetitive parts of a workflow." },
  { title: "Android App Development", body: "Android apps from the first screen to a signed release, sharing a backend with your website when that makes sense." },
];

export const process = [
  { step: "Discover", body: "Goals, users, content and constraints. I read what already exists before proposing anything." },
  { step: "Design", body: "A written design system (palette, type, spacing) and layouts you can review before a line of code." },
  { step: "Develop", body: "Typed, component-based code with real data, validation and honest loading, empty and error states." },
  { step: "Test", body: "Every page, button and form at 375 to 1440 px, plus accessibility, security headers and Lighthouse." },
  { step: "Deploy", body: "Shipped with SEO, a sitemap and documentation, then maintained: fixes, updates and new features." },
];
