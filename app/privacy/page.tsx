import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Motion } from "@/components/Motion";

export const metadata: Metadata = { title: "Privacy", description: "How Nabin Babu Uranw’s website handles the information you send.", alternates: { canonical: "/privacy" } };

const sections: [string, string[]][] = [
  ["What is collected", [
    "When you send a website request, I keep what you type into the form: your name, business, email, phone/WhatsApp number, project details, budget, preferred date and the websites you mention. A request ID and the date are added.",
    "When you use the contact form, I keep your name, email, subject and message.",
    "To stop spam, the server stores a one-way hash of your IP address (not the address itself) for rate limits, and the country your request came from.",
  ]],
  ["Why", [
    "Only to answer you: review your project, contact you about it, prepare a quote, and show you the status of your request. Nothing is sold, shared for advertising or used to train anything.",
  ]],
  ["Where it is kept", [
    "Requests are stored in a database behind this website (Cloudflare). A PDF summary of your request is generated on the server. Emails about your request are sent through EmailJS from a Gmail account, and copies sit in my Gmail inbox.",
    "If you message me on WhatsApp, that conversation is handled by WhatsApp under its own terms.",
  ]],
  ["Who can see it", [
    "Only me. The admin dashboard needs a sign-in, and the server checks that it is my account. Your request’s status page opens only with both your request ID and your email address.",
  ]],
  ["How long", [
    "I keep requests while we’re discussing or working on a project, and for record-keeping after that. Ask me and I will delete your request and its emails.",
  ]],
  ["Cookies", [
    "The public pages set no tracking or advertising cookies. The admin sign-in uses Clerk’s session cookies on my own account only.",
  ]],
  ["Your choices", [
    "Email nabinuranw333@gmail.com or call/WhatsApp +977 976-446-5688 to see, correct or delete what you sent.",
  ]],
];

export default function Privacy() {
  return (
    <Motion>
      <Nav solid />
      <main id="main" className="shell pb-24 pt-32">
        <p className="eyebrow flex items-center gap-3"><span className="h-px w-8 bg-teal" aria-hidden />Privacy</p>
        <h1 className="mt-5 max-w-[18ch] font-display text-[clamp(2.2rem,5vw,3.6rem)] font-semibold leading-[1.02] tracking-tightest">What happens to the information you send.</h1>
        <p className="mt-5 text-[15px] text-muted">Last updated 3 November 2026</p>
        <div className="mt-12 max-w-[68ch] divide-y divide-mist border-y border-mist">
          {sections.map(([h, ps]) => (
            <section key={h} className="py-8">
              <h2 className="font-display text-[22px] font-semibold tracking-tight">{h}</h2>
              {ps.map((p) => <p key={p} className="mt-3 text-[16px] leading-relaxed text-ink/80">{p}</p>)}
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </Motion>
  );
}
