import { Button } from "@/components/ui/button";
import { BookOpen, Bot, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-hero">
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
      
      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-card/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-card">
            <Bot className="w-5 h-5 text-secondary" />
            <span className="text-sm font-medium text-foreground">Smart Library Automation</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-primary-foreground leading-tight">
            Library Book Cart
            <span className="block text-secondary">Robot System</span>
          </h1>

          <p className="text-xl md:text-2xl text-primary-foreground/90 max-w-2xl mx-auto">
            Revolutionizing library operations with intelligent book transportation, 
            safe navigation, and seamless request fulfillment.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link to="/dashboard">
              <Button size="lg" className="bg-card hover:bg-card/90 text-primary shadow-elevated group">
                Librarian Dashboard
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/request">
              <Button size="lg" variant="secondary" className="shadow-elevated">
                <BookOpen className="mr-2 w-5 h-5" />
                Request a Book
              </Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-6 pt-12 max-w-3xl mx-auto">
            <FeatureCard
              icon="📚"
              title="Smart Collection"
              description="Automatic book pickup from drop-off stations"
            />
            <FeatureCard
              icon="🤖"
              title="Safe Navigation"
              description="Advanced sensors for obstacle detection"
            />
            <FeatureCard
              icon="⚡"
              title="Fast Delivery"
              description="Quick book retrieval and delivery"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: string; title: string; description: string }) => (
  <div className="bg-card/80 backdrop-blur-sm p-6 rounded-2xl shadow-card hover:shadow-elevated transition-all hover:-translate-y-1">
    <div className="text-4xl mb-3">{icon}</div>
    <h3 className="text-lg font-semibold text-card-foreground mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
);
