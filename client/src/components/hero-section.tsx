import { Button } from "@/components/ui/button";
import { Zap, ArrowRight, Sparkles } from "lucide-react";
import { useLocation } from "wouter";

interface HeroSectionProps {
  onExploreClick: () => void;
  onSignUpClick: () => void;
}

export default function HeroSection({ onExploreClick, onSignUpClick }: HeroSectionProps) {
  const [, setLocation] = useLocation();

  return (
    <section className="relative bg-gradient-to-br from-purple-50 via-white to-blue-50 py-20 lg:py-32 overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-200 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200 rounded-full opacity-20 blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-5xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 text-purple-700 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            <span>Automate your life, not your business</span>
          </div>

          {/* Main headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
            Automate anything with{" "}
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              visual workflows
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl sm:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
            Connect your favorite apps and services. Build powerful automations in minutes with our
            AI-powered workflow builder—no coding required.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button
              onClick={() => setLocation('/workflows')}
              size="lg"
              className="px-8 py-6 text-lg transform hover:scale-105 shadow-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              data-testid="button-create-workflow"
            >
              <Zap className="mr-2 h-5 w-5" />
              Create Your First Workflow
            </Button>
            <Button
              onClick={() => setLocation('/workflow-templates')}
              variant="outline"
              size="lg"
              className="px-8 py-6 text-lg border-2 border-gray-300 hover:border-purple-600 hover:text-purple-600"
              data-testid="button-browse-templates"
            >
              Browse Templates
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>

          {/* Social proof / stats */}
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto pt-8 border-t border-gray-200">
            <div>
              <div className="text-3xl font-bold text-gray-900">10+</div>
              <div className="text-sm text-gray-600 mt-1">Pre-built Templates</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">7</div>
              <div className="text-sm text-gray-600 mt-1">Node Types</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">6+</div>
              <div className="text-sm text-gray-600 mt-1">Integrations</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
