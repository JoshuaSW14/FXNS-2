import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { SEO } from "@/components/seo";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Play,
  Pause,
  Clock,
  Activity,
  Workflow as WorkflowIcon,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function ToolsPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    email: user?.email || "",
  });

  useEffect(() => {
    setProfileData({
      name: user?.name || "",
      email: user?.email || "",
    });
  }, [user]);

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditing) return;
    (async () => {
      try {
        const res = await fetch("/api/me/profile", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "fetch",
          },
          credentials: "include",
          body: JSON.stringify({
            name: profileData.name,
            email: profileData.email,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error?.message || "Failed to update profile");
        }
        toast({
          title: "Profile updated",
          description: "Your profile has been successfully updated.",
        });
        setIsEditing(false);
      } catch (err: any) {
        toast({
          title: "Update failed",
          description: err.message ?? "Please try again.",
          variant: "destructive",
        });
      }
    })();
  };

  return (
    <>
      <SEO
        title="Profile - fxns"
        description="View your profile and manage your account settings on fxns."
      />

      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Profile</h1>
              <p className="text-muted-foreground">
                View and manage your account settings
              </p>
            </div>
          </div>

          <Separator className="mb-8" />

          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Profile Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleProfileUpdate}
                onKeyDown={(e) => {
                  if (!isEditing && e.key === "Enter") e.preventDefault();
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      type="text"
                      value={profileData.name}
                      onChange={(e) =>
                        setProfileData((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      disabled={!isEditing}
                      data-testid="input-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) =>
                        setProfileData((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      disabled={!isEditing}
                      data-testid="input-email"
                    />
                  </div>
                </div>
                <div className="flex space-x-2">
                  {isEditing ? (
                    <>
                      <Button type="submit" data-testid="button-save">
                        Save Changes
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                        data-testid="button-cancel"
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsEditing(true);
                      }}
                      data-testid="button-edit"
                    >
                      Edit Profile
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
