import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Zap,
  LayoutDashboard,
  GitBranch,
  Store,
  FolderGit2,
  Plug,
  Settings,
  LogOut,
  CreditCard,
  DollarSign,
  ShoppingBag,
  Mail,
  Shield,
  PersonStandingIcon,
  History,
  Receipt,
  PersonStanding,
  CircleUser,
  Info,
  Workflow,
  Hammer,
  Telescope,
  UserPlus,
  PackagePlus,
} from "lucide-react";
import { useAuthDialog } from "@/components/auth/use-auth-dialog";

export function FxnsSidebar() {
  const [location, setLocation] = useLocation();
  const { user, logoutMutation } = useAuth();
  const is = (path: string) => location === path;

  const go = (path: string) => () => setLocation(path);
  const logout = () =>
    logoutMutation.mutate(undefined, { onSuccess: () => setLocation("/") });
  const { openLogin, openRegister } = useAuthDialog();

  return (
    <>
      {user && (
        <Sidebar collapsible="offcanvas" variant="sidebar" side="left">
          <SidebarHeader>
            <div className="flex items-center gap-2 px-2 py-1">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-violet-600 rounded-lg flex items-center justify-center">
                <Zap className="text-white text-sm" />
              </div>
              <a href="/">
                <span className="text-lg font-bold">fxns</span>
              </a>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Browse</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={is("/dashboard")}
                      onClick={go("/dashboard")}
                    >
                      <LayoutDashboard /> <span>Dashboard</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={is("/explore")}
                      onClick={go("/explore")}
                    >
                      <Telescope /> <span>Explore</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={is("/tools")}
                      onClick={go("/tools")}
                    >
                      <Hammer /> <span>Tools</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={is("/workflows")}
                      onClick={go("/workflows")}
                    >
                      <Workflow /> <span>Workflows</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Account</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={is("/profile")}
                      onClick={go("/profile")}
                    >
                      <CircleUser /> <span>Profile</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={is("/integrations")}
                      onClick={go("/integrations")}
                    >
                      <PackagePlus /> <span>App Integrations</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={is("/settings")}
                      onClick={go("/settings")}
                    >
                      <Settings /> <span>Settings</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={is("/email-preferences")}
                      onClick={go("/email-preferences")}
                    >
                      <Mail /> <span>Email Preferences</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={is("/billing")}
                      onClick={go("/billing")}
                    >
                      <Receipt /> <span>Billing History</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {/* <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={is("/purchases")}
                      onClick={go("/purchases")}
                    >
                      <ShoppingBag /> <span>Purchases</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={is("/earnings")}
                      onClick={go("/earnings")}
                    >
                      <DollarSign /> <span>Earnings</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem> */}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={is("/support")}
                      onClick={go("/support")}
                    >
                      <Info /> <span>Support</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {(user.role === "admin" || user.role === "super_admin") && (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={is("/admin")}
                        onClick={go("/admin")}
                      >
                        <Shield className="text-orange-600" />{" "}
                        <span className="text-orange-600 font-semibold">
                          Admin Dashboard
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={logout}>
                  <LogOut /> <span>Log out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            {/* <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={openLogin}>
                    <span>Sign in</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={openRegister}>
                    <UserPlus /> <span>Create account</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu> */}
          </SidebarFooter>

          {/* Thin clickable rail for quick toggle on desktop */}
          <SidebarRail />
        </Sidebar>
      )}
    </>
  );
}
