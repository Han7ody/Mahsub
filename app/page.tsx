import Header from "@/components/marketing/Header";
import HeroSection from "@/components/marketing/HeroSection";
import SwitchFromPaper from "@/components/marketing/SwitchFromPaper";
import DebtManagementFeature from "@/components/marketing/DebtManagementFeature";
import SecurityFeature from "@/components/marketing/SecurityFeature";
import FeaturesSection from "@/components/marketing/FeaturesSection";
import HowItWorksSection from "@/components/marketing/HowItWorksSection";
import StatsSection from "@/components/marketing/StatsSection";
import PricingSection from "@/components/marketing/PricingSection";
import DownloadSection from "@/components/marketing/DownloadSection";
import CTASection from "@/components/marketing/CTASection";
import Footer from "@/components/marketing/Footer";

export default function HomePage() {
  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden">
      <Header />
      <main className="flex-1 pt-20">
        <HeroSection />
        <SwitchFromPaper />
        <DebtManagementFeature />
        <SecurityFeature />
        <FeaturesSection />
        <HowItWorksSection />
        <StatsSection />
        <PricingSection />
        <DownloadSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
