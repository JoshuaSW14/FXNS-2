import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Zap,
  Menu,
  User,
  Settings,
  LogOut,
  X,
  Plus,
  Shield,
  Store,
  ShoppingBag,
  DollarSign,
  Mail,
  Receipt,
  GitBranch,
  Plug,
} from "lucide-react";

export default function NavigationHeader() {
  const [, setLocation] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        setLocation("/");
      },
    });
  };

  return (
    <>
      {user == null && (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-8">
                <Link
                  href="/"
                  className="flex items-center space-x-2"
                  data-testid="link-home"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-violet-600 rounded-lg flex items-center justify-center">
                    <Zap className="text-white text-sm" />
                  </div>
                  <h1 className="text-xl font-bold text-gray-900">fxns</h1>
                </Link>
                <nav className="hidden md:flex space-x-6">
                  <Link
                    href="/explore"
                    className="text-gray-600 hover:text-gray-900 transition-colors"
                    data-testid="link-explore"
                  >
                    Explore
                  </Link>
                  <Link
                    href="/workflows"
                    className="text-gray-600 hover:text-gray-900 transition-colors"
                    data-testid="link-workflows"
                  >
                    Workflows
                  </Link>
                  <Link
                    href="/workflow-marketplace"
                    className="text-gray-600 hover:text-gray-900 transition-colors"
                    data-testid="link-workflow-marketplace"
                  >
                    Marketplace
                  </Link>
                  <Link
                    href="/workflow-templates"
                    className="text-gray-600 hover:text-gray-900 transition-colors"
                    data-testid="link-templates"
                  >
                    Templates
                  </Link>
                  {/* <Link
                                    href="/integrations"
                                    className="text-gray-600 hover:text-gray-900 transition-colors"
                                    data-testid="link-integrations"
                                >
                                    Integrations
                                </Link> */}

                  {/* <a
                                    href="#categories"
                                    className="text-gray-600 hover:text-gray-900 transition-colors"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (window.location.pathname !== '/') {
                                            setLocation('/');
                                            setTimeout(() => {
                                                document.getElementById('categories')?.scrollIntoView({ behavior: 'smooth' });
                                            }, 100);
                                        } else {
                                            document.getElementById('categories')?.scrollIntoView({ behavior: 'smooth' });
                                        }
                                    }}
                                >
                                    Categories
                                </a>
                                <a
                                    href="#how-it-works"
                                    className="text-gray-600 hover:text-gray-900 transition-colors"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (window.location.pathname !== '/') {
                                            setLocation('/');
                                            setTimeout(() => {
                                                document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                                            }, 100);
                                        } else {
                                            document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                                        }
                                    }}
                                >
                                    How it works
                                </a> */}
                </nav>
              </div>

              <div className="flex items-center gap-2 sm:gap-4">
                <div className="hidden sm:flex items-center gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => setLocation("/auth")}
                      data-testid="button-signin"
                      className="hidden md:inline-flex"
                    >
                      Sign in
                    </Button>
                    <Button
                      onClick={() => setLocation("/auth")}
                      data-testid="button-get-started"
                      size="sm"
                    >
                      Get started
                    </Button>
                  </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden flex-shrink-0"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  data-testid="button-mobile-menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </header>
      )}
    </>
  );
}
/*<Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetContent side="left" className="w-[85vw] sm:w-80 max-w-sm">
                    <SheetHeader>
                        <SheetTitle className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-violet-600 rounded-lg flex items-center justify-center">
                                <Zap className="text-white text-sm" />
                            </div>
                            <span className="text-xl font-bold">fxns</span>
                        </SheetTitle>
                    </SheetHeader>

                    <div className="mt-6 space-y-6">
                        <nav className="space-y-3">
                            <Link
                                href="/dashboard"
                                className="block py-2 px-3 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                                data-testid="mobile-link-dashboard"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Dashboard
                            </Link>
                            <Link
                                href="/workflows"
                                className="block py-2 px-3 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                                data-testid="mobile-link-workflows"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Workflows
                            </Link>
                            <Link
                                href="/workflow-marketplace"
                                className="block py-2 px-3 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                                data-testid="mobile-link-workflow-marketplace"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Marketplace
                            </Link>
                            <Link
                                href="/workflow-templates"
                                className="block py-2 px-3 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                                data-testid="mobile-link-templates"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Templates
                            </Link>
                            <Link
                                href="/integrations"
                                className="block py-2 px-3 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                                data-testid="mobile-link-integrations"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Integrations
                            </Link>
                            <Link
                                href="/explore"
                                className="block py-2 px-3 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                                data-testid="mobile-link-explore"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Explore
                            </Link>
                            <a
                                href="#categories"
                                className="block py-2 px-3 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                                onClick={(e) => {
                                    e.preventDefault();
                                    setIsMobileMenuOpen(false);
                                    if (window.location.pathname !== '/') {
                                        setLocation('/');
                                        setTimeout(() => {
                                            document.getElementById('categories')?.scrollIntoView({ behavior: 'smooth' });
                                        }, 100);
                                    } else {
                                        document.getElementById('categories')?.scrollIntoView({ behavior: 'smooth' });
                                    }
                                }}
                            >
                                Categories
                            </a>
                            <a
                                href="#how-it-works"
                                className="block py-2 px-3 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                                onClick={(e) => {
                                    e.preventDefault();
                                    setIsMobileMenuOpen(false);
                                    if (window.location.pathname !== '/') {
                                        setLocation('/');
                                        setTimeout(() => {
                                            document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                                        }, 100);
                                    } else {
                                        document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                                    }
                                }}
                            >
                                How it works
                            </a>
                        </nav>

                        <div className="border-t pt-6">
                            {user ? (
                                <div className="space-y-3">
                                    <div className="flex items-center space-x-3 py-2 px-3">
                                        <Avatar className="h-8 w-8">
                                            <AvatarFallback>
                                                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-sm">{user.name}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Button
                                            variant="ghost"
                                            className="w-full justify-start"
                                            onClick={() => {
                                                setLocation("/purchases");
                                                setIsMobileMenuOpen(false);
                                            }}
                                            data-testid="mobile-link-purchases"
                                        >
                                            <ShoppingBag className="mr-2 h-4 w-4" />
                                            My Purchases
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            className="w-full justify-start"
                                            onClick={() => {
                                                setLocation("/billing");
                                                setIsMobileMenuOpen(false);
                                            }}
                                            data-testid="mobile-link-billing"
                                        >
                                            <Receipt className="mr-2 h-4 w-4" />
                                            Billing History
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            className="w-full justify-start"
                                            onClick={() => {
                                                setLocation("/earnings");
                                                setIsMobileMenuOpen(false);
                                            }}
                                            data-testid="mobile-link-earnings"
                                        >
                                            <DollarSign className="mr-2 h-4 w-4" />
                                            Creator Earnings
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            className="w-full justify-start"
                                            onClick={() => {
                                                setLocation("/email-preferences");
                                                setIsMobileMenuOpen(false);
                                            }}
                                            data-testid="mobile-link-email-preferences"
                                        >
                                            <Mail className="mr-2 h-4 w-4" />
                                            Email Preferences
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            className="w-full justify-start"
                                            onClick={() => {
                                                setLocation("/settings");
                                                setIsMobileMenuOpen(false);
                                            }}
                                            data-testid="mobile-link-settings"
                                        >
                                            <Settings className="mr-2 h-4 w-4" />
                                            Settings
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => {
                                                handleLogout();
                                                setIsMobileMenuOpen(false);
                                            }}
                                            data-testid="mobile-button-logout"
                                        >
                                            <LogOut className="mr-2 h-4 w-4" />
                                            Log out
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => {
                                            setLocation("/auth");
                                            setIsMobileMenuOpen(false);
                                        }}
                                        data-testid="mobile-button-signin"
                                    >
                                        Sign in
                                    </Button>
                                    <Button
                                        className="w-full"
                                        onClick={() => {
                                            setLocation("/auth");
                                            setIsMobileMenuOpen(false);
                                        }}
                                        data-testid="mobile-button-get-started"
                                    >
                                        Get started
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                   {user ? (
                      <div className="mt-6">
                        <Button variant="outline" className="w-full justify-start" onClick={() => setLocation("/settings")}>
                          <Settings className="mr-2 h-4 w-4" /> Settings
                        </Button>
                        <Button variant="destructive" className="w-full mt-2 justify-start" onClick={handleLogout} data-testid="button-logout-mobile">
                          <LogOut className="mr-2 h-4 w-4" /> Log out
                        </Button>
                      </div>
                    ) : null}
                </SheetContent>
            </Sheet>
            */
