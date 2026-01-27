import { Navbar } from "@/components/layout/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { StudyRoomSection } from "@/components/landing/StudyRoomSection";
import { ChatbotSection } from "@/components/landing/ChatbotSection";
import { CTASection } from "@/components/landing/CTASection";
import { Footer } from "@/components/layout/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <StudyRoomSection />
        <ChatbotSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
