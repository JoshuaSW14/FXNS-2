import { type ReactNode } from "react";
import { Mail, Calendar, Music, Cloud, Github, MessageSquare } from "lucide-react";

interface Integration {
  name: string;
  icon: ReactNode;
  color: string;
}

const POPULAR_INTEGRATIONS: Integration[] = [
  { name: "Gmail", icon: <Mail className="w-8 h-8" />, color: "bg-red-500" },
  { name: "Google Calendar", icon: <Calendar className="w-8 h-8" />, color: "bg-blue-500" },
  { name: "Spotify", icon: <Music className="w-8 h-8" />, color: "bg-green-500" },
  { name: "OpenWeather", icon: <Cloud className="w-8 h-8" />, color: "bg-sky-500" },
  { name: "GitHub", icon: <Github className="w-8 h-8" />, color: "bg-gray-800" },
  { name: "Twilio", icon: <MessageSquare className="w-8 h-8" />, color: "bg-red-600" },
];

export default function IntegrationsShowcase() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Connect your favorite apps
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Seamlessly integrate with the tools you already use. More integrations added regularly.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
          {POPULAR_INTEGRATIONS.map((integration) => (
            <div
              key={integration.name}
              className="flex flex-col items-center justify-center p-6 rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all duration-200 bg-white"
            >
              <div className={`${integration.color} text-white p-3 rounded-lg mb-3`}>
                {integration.icon}
              </div>
              <span className="text-sm font-medium text-gray-700">{integration.name}</span>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-sm text-gray-500">
            And many more integrations available through our workflow builder
          </p>
        </div>
      </div>
    </section>
  );
}
