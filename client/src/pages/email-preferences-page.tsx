import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NavigationHeader from "@/components/navigation-header";
import Footer from "@/components/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Bell, ShoppingBag, Shield, Megaphone } from "lucide-react";
import { apiRequest } from "@/lib/api";

interface EmailPreferences {
  weeklyDigest: boolean;
  newReviews: boolean;
  toolActivity: boolean;
  moderationAlerts: boolean;
  marketingEmails: boolean;
}

export default function EmailPreferencesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [preferences, setPreferences] = useState<EmailPreferences>({
    weeklyDigest: true,
    newReviews: true,
    toolActivity: true,
    moderationAlerts: true,
    marketingEmails: false,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["email-preferences"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/email/preferences');
      if (!response.ok) throw new Error("Failed to fetch preferences");
      const data = await response.json();
      setPreferences({
        weeklyDigest: data.weeklyDigest ?? true,
        newReviews: data.newReviews ?? true,
        toolActivity: data.toolActivity ?? true,
        moderationAlerts: data.moderationAlerts ?? true,
        marketingEmails: data.marketingEmails ?? false,
      });
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (prefs: EmailPreferences) => {
      const response = await apiRequest('PUT', '/api/email/preferences', prefs);
      if (!response.ok) throw new Error("Failed to update preferences");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-preferences"] });
      toast({
        title: "Preferences saved",
        description: "Your email notification preferences have been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleToggle = (key: keyof EmailPreferences) => {
    const newPrefs = { ...preferences, [key]: !preferences[key] };
    setPreferences(newPrefs);
  };

  const handleSave = () => {
    updateMutation.mutate(preferences);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        {/* <NavigationHeader /> */}
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* <NavigationHeader /> */}
      
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Email Preferences</h1>
          <p className="text-muted-foreground">
            Manage how you receive notifications and updates from fxns
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Weekly Digest
              </CardTitle>
              <CardDescription>
                Get a weekly roundup of trending tools and community highlights every Monday
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label htmlFor="weeklyDigest" className="cursor-pointer">
                  Send me weekly digest emails
                </Label>
                <Switch
                  id="weeklyDigest"
                  checked={preferences.weeklyDigest}
                  onCheckedChange={() => handleToggle("weeklyDigest")}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Reviews & Ratings
              </CardTitle>
              <CardDescription>
                Get notified when someone reviews your tools
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label htmlFor="newReviews" className="cursor-pointer">
                  Notify me about new reviews
                </Label>
                <Switch
                  id="newReviews"
                  checked={preferences.newReviews}
                  onCheckedChange={() => handleToggle("newReviews")}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                Marketplace Activity
              </CardTitle>
              <CardDescription>
                Get notified about purchases, sales, and tool performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label htmlFor="toolActivity" className="cursor-pointer">
                  Notify me about tool activity and sales
                </Label>
                <Switch
                  id="toolActivity"
                  checked={preferences.toolActivity}
                  onCheckedChange={() => handleToggle("toolActivity")}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Moderation Alerts
              </CardTitle>
              <CardDescription>
                Get alerted when tools are flagged for review (admins only)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label htmlFor="moderationAlerts" className="cursor-pointer">
                  Send me moderation alerts
                </Label>
                <Switch
                  id="moderationAlerts"
                  checked={preferences.moderationAlerts}
                  onCheckedChange={() => handleToggle("moderationAlerts")}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="w-5 h-5" />
                Marketing & Updates
              </CardTitle>
              <CardDescription>
                Receive news about new features, promotions, and platform updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label htmlFor="marketingEmails" className="cursor-pointer">
                  Send me marketing emails
                </Label>
                <Switch
                  id="marketingEmails"
                  checked={preferences.marketingEmails}
                  onCheckedChange={() => handleToggle("marketingEmails")}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              size="lg"
            >
              {updateMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Save Preferences
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
