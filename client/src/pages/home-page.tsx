import NavigationHeader from "@/components/navigation-header";
import HeroSection from "@/components/hero-section";
import IntegrationsShowcase from "@/components/integrations-showcase";
import UseCasesSection from "@/components/use-cases-section";
import HowItWorksSection from "@/components/how-it-works-section";
import Footer from "@/components/footer";
import { SEO } from "@/components/seo";
import { StructuredData } from "@/components/structured-data";
import { useLocation } from "wouter";

export default function HomePage() {
  const [, setLocation] = useLocation();

  return (
    <>
      <SEO
        title="fxns - Automate Your Life with Visual Workflows"
        description="Build powerful automations in minutes. Connect your favorite apps, create visual workflows, and automate everything—no coding required."
        canonicalUrl="https://www.fxns.ca/"
      />
      <StructuredData type="Organization" />
      <StructuredData type="WebSite" />

      <div className="min-h-screen bg-neutral-50">
        {/* <NavigationHeader /> */}
        <div>
          <HeroSection
            onExploreClick={() => setLocation("/explore")}
            onSignUpClick={() => setLocation("/auth")}
          />
          <IntegrationsShowcase />
          <UseCasesSection />
          <HowItWorksSection />
        </div>
      </div>
    </>
  );
}
