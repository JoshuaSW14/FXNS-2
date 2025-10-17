import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import NavigationHeader from "@/components/navigation-header";
import { useQuery, useMutation } from "@tanstack/react-query";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
    User,
    Shield,
    CreditCard,
    Smartphone,
    Trash2,
    LogOut,
    Crown
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

export default function SettingsPage() {
    const { user, logoutMutation } = useAuth();
    const { toast } = useToast();
    

    // Upgrade to Pro mutation
    const upgradeMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/subscription/upgrade', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to create checkout session');
            }
            return res.json();
        },
        onSuccess: (data) => {
            // Redirect to Stripe checkout
            if (data.checkoutUrl) {
                window.location.href = data.checkoutUrl;
            }
        },
        onError: (error: Error) => {
            toast({
                title: 'Upgrade failed',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    // password modal state
    const [pwOpen, setPwOpen] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const handleLogout = () => {
        logoutMutation.mutate();
    };

    // Sessions: fetch from API
    type SessionRow = {
        id: string;
        userAgent: string | null;
        ip: string | null;
        createdAt: string;
        expiresAt: string;
        revokedAt: string | null;
        isCurrent: boolean;
        isActive: boolean;
    };

    const { data: sessionsData, refetch: refetchSessions, isLoading: isLoadingSessions } =
        useQuery<{ sessions: SessionRow[] }>({
            queryKey: ["/api/me/sessions"],
            queryFn: async () => {
                const res = await fetch("/api/me/sessions", { credentials: "include", headers: { 'X-Requested-With': 'fetch' } });
                if (!res.ok) throw new Error("Failed to load sessions");
                return res.json();
            },
            enabled: !!user,
        });
    const sessions = sessionsData?.sessions ?? [];

    const revokeMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/me/sessions/${id}/revoke`, {
                method: "POST",
                credentials: "include",
                headers: { 'X-Requested-With': 'fetch' },
            });
            if (!res.ok) throw new Error("Failed to revoke session");
        },
        onSuccess: () => {
            toast({ title: "Session revoked", description: "The session has been signed out." });
            refetchSessions();
        },
        onError: (e: Error) => {
            toast({ title: "Couldn’t revoke", description: e.message, variant: "destructive" });
        },
    });

    const logoutAllMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/me/sessions/logout-all`, {
                method: "POST",
                credentials: "include",
                headers: { 'X-Requested-With': 'fetch' },
            });
            if (!res.ok) throw new Error("Failed to log out other devices");
        },
        onSuccess: () => {
            toast({ title: "Logged out of other devices" });
            refetchSessions();
        },
        onError: (e: Error) => {
            toast({ title: "Couldn’t log out others", description: e.message, variant: "destructive" });
        },
    });

    return (
        <div className="min-h-screen bg-neutral-50">
            {/* <NavigationHeader /> */}
            <div>
                <section className="py-16 bg-white">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
                            <p className="text-gray-600">Manage your account settings and preferences</p>
                        </div>

                        <div className="space-y-8">
                            {/* Security Settings */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center space-x-2">
                                        <Shield className="h-5 w-5" />
                                        <span>Security</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-medium text-gray-900">Password</h3>
                                            <p className="text-sm text-gray-600">Last changed 3 months ago</p>
                                        </div>
                                        <Button variant="outline" size="sm" data-testid="button-change-password" onClick={() => setPwOpen(true)}>
                                            Change Password
                                        </Button>
                                    </div>
                                    <Separator />
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-medium text-gray-900">Two-Factor Authentication</h3>
                                            <p className="text-sm text-gray-600">Add an extra layer of security</p>
                                        </div>
                                        <Button variant="outline" size="sm" data-testid="button-setup-2fa" disabled className="opacity-70 cursor-not-allowed" title="Two-Factor Authentication is coming soon">
                                            Coming soon
                                        </Button>
                                    </div>
                                    {/* Sign out current device */}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-medium text-gray-900">Sign out</h3>
                                            <p className="text-sm text-gray-600">End your session on this device</p>
                                        </div>
                                        <Button variant="destructive" size="sm" onClick={handleLogout} data-testid="button-logout">
                                            Log out
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Subscription Settings */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center space-x-2">
                                        <CreditCard className="h-5 w-5" />
                                        <span>Subscription</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center space-x-2 mb-2">
                                                <h3 className="font-medium text-gray-900">Current Plan</h3>
                                                <Badge variant={user?.subscriptionStatus === 'active' ? 'default' : 'secondary'}>
                                                    {user?.subscriptionStatus === 'active' ? 'Pro' : 'Free'}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-gray-600">
                                                {user?.subscriptionStatus === 'active' 
                                                    ? 'Enjoy unlimited custom tools and advanced features'
                                                    : 'Upgrade to Pro for unlimited custom tools and advanced features'
                                                }
                                            </p>
                                        </div>
                                        {user?.subscriptionStatus !== 'active' && (
                                            <Button 
                                                className="flex items-center space-x-2" 
                                                data-testid="button-upgrade"
                                                onClick={() => upgradeMutation.mutate()}
                                                disabled={upgradeMutation.isPending}
                                            >
                                                <Crown className="h-4 w-4" />
                                                <span>{upgradeMutation.isPending ? 'Loading...' : 'Upgrade to Pro'}</span>
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Active Sessions */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center space-x-2">
                                        <Smartphone className="h-5 w-5" />
                                        <span>Active Sessions</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {isLoadingSessions ? (
                                        <div className="text-sm text-gray-500">Loading sessions…</div>
                                    ) : sessions.length === 0 ? (
                                        <div className="text-sm text-gray-500">No sessions found.</div>
                                    ) : (
                                        <div className="space-y-4">
                                            {sessions.map((s) => {
                                                const created = new Date(s.createdAt).toLocaleString();
                                                const note = s.revokedAt
                                                    ? "revoked"
                                                    : s.isActive
                                                        ? "active"
                                                        : "expired";
                                                return (
                                                    <div key={s.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                                                        <div>
                                                            <div className="flex items-center space-x-2">
                                                                <h3 className="font-medium text-gray-900">{s.userAgent || "Unknown device"}</h3>
                                                                {s.isCurrent && <Badge variant="secondary">Current</Badge>}
                                                                {!s.isCurrent && !s.isActive && <Badge variant="outline">Past</Badge>}
                                                            </div>
                                                            <p className="text-sm text-gray-600">
                                                                {s.ip || "—"} • started {created} • {note}
                                                            </p>
                                                        </div>
                                                        {!s.isCurrent && !s.revokedAt && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => revokeMutation.mutate(s.id)}
                                                                data-testid={`button-revoke-${s.id}`}
                                                            >
                                                                Revoke
                                                            </Button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Danger Zone */}
                            <Card className="border-red-200">
                                <CardHeader>
                                    <CardTitle className="text-red-600 flex items-center space-x-2">
                                        <Trash2 className="h-5 w-5" />
                                        <span>Danger Zone</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-medium text-gray-900">Log out from all devices</h3>
                                            <p className="text-sm text-gray-600">This will sign you out of all active sessions</p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => logoutAllMutation.mutate()}
                                            className="border-red-200 text-red-600 hover:bg-red-50"
                                            data-testid="button-logout-all"
                                        >
                                            <LogOut className="mr-2 h-4 w-4" />
                                            Log Out
                                        </Button>
                                    </div>
                                    <Separator />
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-medium text-red-600">Delete Account</h3>
                                            <p className="text-sm text-gray-600">
                                                Permanently delete your account and all associated data
                                            </p>
                                        </div>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            data-testid="button-delete-account"
                                        >
                                            Delete Account
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </section>
            </div>

            {/* Change Password Modal */}
            <Dialog open={pwOpen} onOpenChange={setPwOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Change Password</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="currentPassword">Current password</Label>
                            <Input
                                id="currentPassword"
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                data-testid="input-current-password"
                            />
                        </div>
                        <div>
                            <Label htmlFor="newPassword">New password</Label>
                            <Input
                                id="newPassword"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                data-testid="input-new-password"
                            />
                        </div>
                        <div>
                            <Label htmlFor="confirmPassword">Confirm new password</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                data-testid="input-confirm-password"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setPwOpen(false)}
                            data-testid="button-cancel-password"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={async () => {
                                if (!currentPassword || !newPassword) {
                                    toast({ title: "Missing fields", description: "Please fill in all fields.", variant: "destructive" });
                                    return;
                                }
                                if (newPassword !== confirmPassword) {
                                    toast({ title: "Passwords don't match", description: "Please confirm your new password.", variant: "destructive" });
                                    return;
                                }
                                try {
                                    const res = await fetch("/api/me/change-password", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json", 'X-Requested-With': 'fetch' },
                                        credentials: "include",
                                        body: JSON.stringify({ currentPassword, newPassword }),
                                    });
                                    const data = await res.json();
                                    if (!res.ok) throw new Error(data?.error?.message || "Failed to change password");
                                    toast({ title: "Password updated", description: "Your password has been changed." });
                                    setPwOpen(false);
                                    setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
                                } catch (err: any) {
                                    toast({ title: "Change failed", description: err.message ?? "Please try again.", variant: "destructive" });
                                }
                            }}
                            data-testid="button-save-password"
                        >
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
