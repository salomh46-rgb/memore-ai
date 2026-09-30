import SpotlightCursor from "@/components/SpotlightCursor";
import Hero from "@/components/Hero";
import ProblemSection from "@/components/ProblemSection";
import SolutionSection from "@/components/SolutionSection";
import RulesTable from "@/components/RulesTable";
import Pricing from "@/components/Pricing";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen">
      <SpotlightCursor />
      <Hero />
      <ProblemSection />
      <SolutionSection />
      <RulesTable />
      <Pricing />
      <CTA />
      <Footer />
    </main>
  );
}
