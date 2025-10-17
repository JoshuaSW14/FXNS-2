// support-page.tsx
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  LifeBuoy,
  HelpCircle,
  BookOpen,
  MessageSquare,
  Shield,
  CreditCard,
  Settings,
  Zap,
  Store,
  Search,
  Mail,
  Globe,
  GitBranch,
  Users,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";

type Article = {
  id: string;
  title: string;
  slug?: string;
  excerpt?: string;
  category?: string;
  tags?: string[];
  updatedAt?: string;
};

type Faq = {
  id: string;
  q: string;
  a: string;
  category?: string;
};

type StatusResp = {
  status: "operational" | "degraded" | "partial_outage" | "major_outage" | "maintenance";
  incidents?: Array<{ id: string; title: string; startedAt: string; url?: string }>;
  updatedAt?: string;
};

const CATEGORIES: { id: string; name: string; icon: any; color: string; description: string }[] = [
  { id: "getting-started", name: "Getting Started", icon: Zap, color: "text-blue-600", description: "Basics, onboarding, first run" },
  { id: "builder", name: "Tool Builder", icon: Settings, color: "text-violet-600", description: "Creating & testing tools" },
  { id: "marketplace", name: "Marketplace", icon: Store, color: "text-emerald-600", description: "Publishing & selling tools" },
  { id: "billing", name: "Billing", icon: CreditCard, color: "text-amber-600", description: "Plans, payments, invoices" },
  { id: "account", name: "Account", icon: Shield, color: "text-indigo-600", description: "Profile, sessions, security" },
  { id: "usage", name: "Usage & Limits", icon: Activity, color: "text-rose-600", description: "Quotas, performance, errors" },
];

// Soft fallback FAQs if API isn’t present
const DEFAULT_FAQS: Faq[] = [
  {
    id: "faq-1",
    q: "How do I create my first custom tool?",
    a: "Go to Dashboard → Quick Actions → “Create Custom Tool”. Fill in the schema, connect actions, and use Test to iterate before publishing.",
    category: "getting-started",
  },
  {
    id: "faq-2",
    q: "Why is my OAuth redirect marked insecure?",
    a: "Ensure the callback URL exactly matches what’s configured with the provider (https, port, and path). In dev, use your HTTPS dev server and a provider-allowed localhost redirect.",
    category: "builder",
  },
  {
    id: "faq-3",
    q: "How does FXNS pricing work?",
    a: "Free for exploring. Pro unlocks unlimited custom tools and advanced features. You can upgrade from Settings → Subscription.",
    category: "billing",
  },
  {
    id: "faq-4",
    q: "Where can I see my active sessions?",
    a: "Open Settings → Active Sessions to view, revoke, or log out other devices.",
    category: "account",
  },
];

export default function SupportPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState<string>("all");

  // Articles (supports query params for search/category if your API exposes them)
  const { data: articlesData, isLoading: loadingArticles } = useQuery<{ articles: Article[] }>({
    queryKey: ["/api/support/articles", { search: searchQuery || undefined, category: category !== "all" ? category : undefined }],
    queryFn: async ({ queryKey }) => {
      const [, params] = queryKey as [string, { search?: string; category?: string }];
      const qs = new URLSearchParams();
      if (params.search) qs.set("search", params.search);
      if (params.category) qs.set("category", params.category);
      const res = await fetch(`/api/support/articles${qs.toString() ? `?${qs.toString()}` : ""}`, {
        credentials: "include",
        headers: { "X-Requested-With": "fetch" },
      });
      // If your backend isn’t ready, gracefully fallback:
      if (!res.ok) return { articles: [] };
      return res.json();
    },
  });
  const articles = articlesData?.articles ?? [];

  // FAQs
  const { data: faqData } = useQuery<{ faqs: Faq[] }>({
    queryKey: ["/api/support/faqs"],
    queryFn: async () => {
      const res = await fetch("/api/support/faqs", {
        credentials: "include",
        headers: { "X-Requested-With": "fetch" },
      });
      if (!res.ok) return { faqs: DEFAULT_FAQS };
      return res.json();
    },
  });
  const faqs = faqData?.faqs ?? DEFAULT_FAQS;

  // Status
  const { data: statusData } = useQuery<StatusResp>({
    queryKey: ["/api/status"],
    queryFn: async () => {
      const res = await fetch("/api/status", {
        headers: { "X-Requested-With": "fetch" },
        credentials: "include",
      });
      if (!res.ok) {
        return { status: "operational", updatedAt: new Date().toISOString(), incidents: [] };
      }
      return res.json();
    },
  });

  // Ticket submit
  const [topic, setTopic] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [email, setEmail] = useState<string>(user?.email ?? "");

  const createTicket = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "fetch",
        },
        body: JSON.stringify({ topic, message, email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || "Failed to submit ticket");
      return data;
    },
    onSuccess: () => {
      toast({ title: "Ticket submitted", description: "We’ll get back to you via email." });
      setTopic("");
      setMessage("");
    },
    onError: (e: any) => {
      toast({ title: "Couldn’t submit", description: e?.message || "Please try again.", variant: "destructive" });
    },
  });

  const filteredFaqs = useMemo(
    () =>
      faqs.filter((f) => {
        const matchesCat = category === "all" || f.category === category;
        const matchesSearch =
          !searchQuery ||
          f.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.a.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCat && matchesSearch;
      }),
    [faqs, category, searchQuery]
  );

  const statusColor =
    statusData?.status === "operational"
      ? "text-emerald-600"
      : statusData?.status === "maintenance"
      ? "text-amber-600"
      : "text-red-600";

  const StatusIcon =
    statusData?.status === "operational"
      ? CheckCircle2
      : statusData?.status === "maintenance"
      ? AlertTriangle
      : AlertTriangle;

  return (
    <>
      <Helmet>
        <title>Support — fxns</title>
        <meta name="description" content="Get help with FXNS. Search docs, browse FAQs, check system status, or contact support." />
        <link rel="canonical" href="https://www.fxns.ca/support" />
      </Helmet>

      <div className="min-h-screen bg-neutral-50">
        <section className="bg-gradient-to-br from-blue-50 via-white to-violet-50 py-10 sm:py-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-6 sm:mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-primary-100 mb-3">
                <LifeBuoy className="h-4 w-4 text-blue-600" />
                <span className="text-xs sm:text-sm text-gray-700">FXNS Support</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
                How can we help?
              </h1>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Search guides, explore FAQs, check status, or reach out to our team.
              </p>
            </div>

            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search articles, FAQs, and topics…"
                  className="pl-10 py-6 text-base"
                  data-testid="support-search"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="py-10 sm:py-14 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            {/* Top row: Categories + Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <HelpCircle className="h-5 w-5" />
                    Browse by Category
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setCategory(c.id === category ? "all" : c.id)}
                        className={`flex items-start gap-3 p-4 rounded-lg border hover:bg-gray-50 transition text-left ${
                          category === c.id ? "border-primary-300 ring-1 ring-primary-200 bg-primary-50" : "border-gray-200"
                        }`}
                        data-testid={`category-${c.id}`}
                      >
                        <c.icon className={`h-5 w-5 ${c.color} mt-0.5`} />
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 truncate">{c.name}</div>
                          <div className="text-sm text-gray-600 line-clamp-2">{c.description}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                  {category !== "all" && (
                    <div className="mt-3">
                      <Button variant="ghost" size="sm" onClick={() => setCategory("all")} className="text-gray-600">
                        Clear filter
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <StatusIcon className={`h-5 w-5 ${statusColor}`} />
                    System Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      <div className="font-medium capitalize">{statusData?.status?.replace("_", " ") || "operational"}</div>
                      <div className="text-xs text-gray-500">
                        Updated {statusData?.updatedAt ? new Date(statusData.updatedAt).toLocaleString() : "—"}
                      </div>
                    </div>
                    <Badge variant="secondary" className="capitalize">
                      {statusData?.status || "operational"}
                    </Badge>
                  </div>
                  {statusData?.incidents && statusData.incidents.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <Separator />
                      <div className="text-xs text-gray-500 mt-2">Active incidents</div>
                      {statusData.incidents.map((i) => (
                        <div key={i.id} className="flex items-center justify-between text-sm">
                          <span className="truncate">{i.title}</span>
                          {i.url && (
                            <a
                              href={i.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                            >
                              View <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Articles */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Articles & Guides</h2>
                <div className="text-sm text-gray-600">
                  {loadingArticles ? "Loading…" : `${articles.length} result${articles.length === 1 ? "" : "s"}`}
                </div>
              </div>
              {loadingArticles ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="p-5 border border-gray-200 rounded-xl animate-pulse bg-white">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  ))}
                </div>
              ) : articles.length === 0 ? (
                <Card className="border-gray-200">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Search className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-gray-600 text-sm">No articles found. Try another search or browse FAQs below.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {articles.map((a) => (
                    <Card
                      key={a.id}
                      className="hover:shadow-md transition cursor-pointer"
                      onClick={() => setLocation(`/support/article/${a.slug || a.id}`)}
                      data-testid={`article-${a.id}`}
                    >
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base line-clamp-2">{a.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {a.excerpt && <p className="text-sm text-gray-600 line-clamp-3 mb-3">{a.excerpt}</p>}
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-500 capitalize">{a.category || "general"}</div>
                          <div className="flex gap-1 flex-wrap justify-end">
                            {(a.tags || []).slice(0, 3).map((t) => (
                              <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* FAQs + Contact */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Frequently Asked Questions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredFaqs.length === 0 ? (
                    <div className="text-sm text-gray-600">No FAQs match your search.</div>
                  ) : (
                    <Accordion type="single" collapsible className="w-full" data-testid="faq-accordion">
                      {filteredFaqs.map((f) => (
                        <AccordionItem key={f.id} value={f.id}>
                          <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                          <AccordionContent>
                            <p className="text-gray-700 text-sm leading-relaxed">{f.a}</p>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Contact Support
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      data-testid="contact-email"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Topic</label>
                    <Input
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g., Billing, OAuth callback, Builder error"
                      data-testid="contact-topic"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Message</label>
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Describe the issue, steps to reproduce, expected/actual behavior…"
                      className="min-h-[140px]"
                      data-testid="contact-message"
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => createTicket.mutate()}
                    disabled={!email || !topic || !message || createTicket.isPending}
                    data-testid="contact-submit"
                  >
                    {createTicket.isPending ? "Submitting…" : "Submit Ticket"}
                  </Button>
                  <p className="text-xs text-gray-500">
                    We typically respond within one business day.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick links */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="hover:shadow-md transition">
                <CardContent className="p-5 flex items-start gap-3">
                  <BookOpen className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <div className="font-medium">Documentation</div>
                    <p className="text-sm text-gray-600">Step-by-step guides and API notes.</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => setLocation("/docs")}>
                      Open Docs
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition">
                <CardContent className="p-5 flex items-start gap-3">
                  <GitBranch className="h-5 w-5 text-violet-600 mt-0.5" />
                  <div>
                    <div className="font-medium">Changelog</div>
                    <p className="text-sm text-gray-600">What’s new and improved.</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => setLocation("/changelog")}>
                      View Updates
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition">
                <CardContent className="p-5 flex items-start gap-3">
                  <Users className="h-5 w-5 text-emerald-600 mt-0.5" />
                  <div>
                    <div className="font-medium">Community</div>
                    <p className="text-sm text-gray-600">Ask questions & share tips.</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => setLocation("/community")}>
                      Join In
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition">
                <CardContent className="p-5 flex items-start gap-3">
                  <Globe className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <div className="font-medium">Roadmap</div>
                    <p className="text-sm text-gray-600">What we’re building next.</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => setLocation("/roadmap")}>
                      See Roadmap
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Footer CTA */}
            <section className="py-8 sm:py-12 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white rounded-xl p-6 sm:p-8 text-center shadow-lg">
                  <h2 className="text-xl sm:text-2xl font-bold mb-3">Still stuck?</h2>
                  <p className="text-sm sm:text-base text-muted-foreground mb-4 max-w-2xl mx-auto">
                    Send us the details and we’ll help you resolve it quickly.
                  </p>
                  <Button size="lg" onClick={() => {
                    const el = document.querySelector<HTMLButtonElement>('[data-testid="contact-submit"]');
                    el?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}>
                    <Mail className="h-4 w-4 mr-2" />
                    Contact Support
                  </Button>
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </>
  );
}
