import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { Projects } from "@/components/Projects";
import { Skills } from "@/components/Skills";
import { Services } from "@/components/Services";
import { Process } from "@/components/Process";
import { Contact } from "@/components/Contact";
import { RequestSection } from "@/components/Request";
import { Footer } from "@/components/Footer";
import { Motion } from "@/components/Motion";
import { Film } from "@/components/Film";
import gh from "@/data/github.json";
import type { ProjectsPayload } from "@/lib/types";

export default function Page() {
  const snapshot = gh as unknown as ProjectsPayload;
  return (
    <Motion>
      <Nav />
      <main id="main">
        <Hero latest={snapshot.repos[0] ?? null} />
        <Film />
        <About />
        <Projects snapshot={snapshot} />
        <Skills repos={snapshot.repos} />
        <Services />
        <Process />
        <RequestSection />
        <Contact />
      </main>
      <Footer />
    </Motion>
  );
}
