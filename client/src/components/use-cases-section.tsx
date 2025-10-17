import { type ReactNode } from "react";
import { Bell, Mail, Database, Calendar, Home, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface UseCase {
  icon: ReactNode;
  title: string;
  description: string;
  examples: string[];
}

const USE_CASES: UseCase[] = [
  {
    icon: <Bell className="w-6 h-6" />,
    title: "Smart Notifications",
    description: "Stay informed with automated alerts",
    examples: ["Weather updates", "Price drop alerts", "Daily summaries"]
  },
  {
    icon: <Mail className="w-6 h-6" />,
    title: "Email Automation",
    description: "Streamline your inbox and communications",
    examples: ["Email digests", "Auto-responses", "Newsletter management"]
  },
  {
    icon: <Database className="w-6 h-6" />,
    title: "Data Sync",
    description: "Keep your data synchronized across platforms",
    examples: ["Backup workflows", "Cross-platform sync", "Data migration"]
  },
  {
    icon: <Calendar className="w-6 h-6" />,
    title: "Schedule Management",
    description: "Automate your calendar and reminders",
    examples: ["Meeting prep", "Task reminders", "Event coordination"]
  },
  {
    icon: <Home className="w-6 h-6" />,
    title: "Smart Home",
    description: "Control your devices with automation",
    examples: ["Evening routines", "Climate control", "Security alerts"]
  },
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: "Personal Finance",
    description: "Track and manage your money automatically",
    examples: ["Expense tracking", "Budget alerts", "Investment updates"]
  }
];

export default function UseCasesSection() {
  const [, setLocation] = useLocation();

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Automate everything in your life
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            From personal productivity to smart home control, discover how workflows can simplify your daily tasks.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {USE_CASES.map((useCase) => (
            <div
              key={useCase.title}
              className="bg-white rounded-xl p-6 border border-gray-200 hover:border-purple-300 hover:shadow-xl transition-all duration-200"
            >
              <div className="bg-purple-100 text-purple-600 p-3 rounded-lg w-fit mb-4">
                {useCase.icon}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{useCase.title}</h3>
              <p className="text-gray-600 mb-4">{useCase.description}</p>
              <ul className="space-y-2">
                {useCase.examples.map((example) => (
                  <li key={example} className="text-sm text-gray-500 flex items-center">
                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full mr-2"></span>
                    {example}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Button
            onClick={() => setLocation('/workflow-templates')}
            size="lg"
            variant="outline"
            className="border-2 border-purple-600 text-purple-600 hover:bg-purple-50"
          >
            Explore All Templates
          </Button>
        </div>
      </div>
    </section>
  );
}
