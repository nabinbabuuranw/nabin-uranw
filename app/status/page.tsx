import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Motion } from "@/components/Motion";
import { StatusLookup } from "@/components/StatusLookup";

export const metadata: Metadata = {
  title: "Check your request status",
  description: "Track a website request sent to Nabin Babu Uranw with your request ID and email.",
  alternates: { canonical: "/status" },
};

export default function StatusPage() {
  return (
    <Motion>
      <Nav solid />
      <main id="main" className="bg-ink pt-16 text-paper">
        <StatusLookup />
      </main>
      <Footer />
    </Motion>
  );
}
