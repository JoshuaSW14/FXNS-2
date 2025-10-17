import { Suspense, lazy, ComponentType } from "react";
import { Switch, Route, RouteProps } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import ErrorBoundary from "@/components/error-boundary";
import { RouteLoader } from "@/components/route-loader";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { ReloadPrompt } from "@/components/reload-prompt";

import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import ExplorePage from "@/pages/explore-page";
import FxnPage from "@/pages/fxn-page";
import NotFound from "@/pages/not-found";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import PrivacyPolicyPage from "@/pages/privacy-policy-page";
import TermsOfServicePage from "@/pages/terms-of-service-page";
import SecurityPage from "@/pages/security-page";
import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "./components/ui/sidebar";
import { FxnsSidebar } from "./components/fxns-sidebar";
import { AuthDialogProvider } from "./components/auth/use-auth-dialog";
import Footer from "./components/footer";
import NavigationHeader from "./components/navigation-header";

const DashboardPage = lazy(() => import("@/pages/dashboard-page"));
const ToolsPage = lazy(() => import("@/pages/tools-page"));

const VisualToolBuilderPage = lazy(
  () => import("@/pages/visual-tool-builder-page")
);
const AdminDashboardPage = lazy(() => import("@/pages/admin-dashboard-page"));
const SubscriptionPage = lazy(() =>
  import("@/pages/subscription-page").then((m) => ({
    default: m.SubscriptionPage,
  }))
);
const EarningsPage = lazy(() => import("@/pages/earnings-page"));
const MyPurchasesPage = lazy(() => import("@/pages/my-purchases-page"));
const BillingHistoryPage = lazy(() => import("@/pages/billing-history-page"));
const BillingDetailPage = lazy(() => import("@/pages/billing-detail-page"));
const EmailPreferencesPage = lazy(
  () => import("@/pages/email-preferences-page")
);
const SettingsPage = lazy(() => import("@/pages/settings-page"));
const CheckoutSuccessPage = lazy(() =>
  import("@/pages/checkout-success").then((m) => ({
    default: m.CheckoutSuccessPage,
  }))
);
const WorkflowsPage = lazy(() => import("@/pages/workflows-page"));
const WorkflowEditorPage = lazy(() => import("@/pages/workflow-editor-page"));
const IntegrationsPage = lazy(() => import("@/pages/integrations-page"));
const ProfilePage = lazy(() => import("@/pages/profile-page"));
const SupportPage = lazy(() => import("@/pages/support-page"));

const LazyDashboard = (props: any) => (
  <Suspense fallback={<RouteLoader />}>
    <DashboardPage {...props} />
  </Suspense>
);

const LazyToolBuilder = (props: any) => (
  <ErrorBoundary>
    <Suspense fallback={<RouteLoader />}>
      <VisualToolBuilderPage {...props} />
    </Suspense>
  </ErrorBoundary>
);

const LazyAdminDashboard = (props: any) => (
  <Suspense fallback={<RouteLoader />}>
    <AdminDashboardPage {...props} />
  </Suspense>
);

const LazySubscription = (props: any) => (
  <Suspense fallback={<RouteLoader />}>
    <SubscriptionPage {...props} />
  </Suspense>
);

const LazyEarnings = (props: any) => (
  <Suspense fallback={<RouteLoader />}>
    <EarningsPage {...props} />
  </Suspense>
);

const LazyPurchases = (props: any) => (
  <Suspense fallback={<RouteLoader />}>
    <MyPurchasesPage {...props} />
  </Suspense>
);

const LazyBillingHistory = (props: any) => (
  <Suspense fallback={<RouteLoader />}>
    <BillingHistoryPage {...props} />
  </Suspense>
);

const LazyBillingDetail = (props: any) => (
  <Suspense fallback={<RouteLoader />}>
    <BillingDetailPage {...props} />
  </Suspense>
);

const LazyEmailPreferences = (props: any) => (
  <Suspense fallback={<RouteLoader />}>
    <EmailPreferencesPage {...props} />
  </Suspense>
);

const LazySettings = (props: any) => (
  <Suspense fallback={<RouteLoader />}>
    <SettingsPage {...props} />
  </Suspense>
);

const LazyProfile = (props: any) => (
  <Suspense fallback={<RouteLoader />}>
    <ProfilePage {...props} />
  </Suspense>
);

const LazySupport = (props: any) => (
  <Suspense fallback={<RouteLoader />}>
    <SupportPage {...props} />
  </Suspense>
);


const LazyCheckoutSuccess = (props: any) => (
  <Suspense fallback={<RouteLoader />}>
    <CheckoutSuccessPage {...props} />
  </Suspense>
);

const LazyWorkflows = (props: any) => (
  <Suspense fallback={<RouteLoader />}>
    <WorkflowsPage {...props} />
  </Suspense>
);

const LazyTools = (props: any) => (
  <Suspense fallback={<RouteLoader />}>
    <ToolsPage {...props} />
  </Suspense>
);

const LazyWorkflowEditor = (props: any) => (
  <ErrorBoundary>
    <Suspense fallback={<RouteLoader />}>
      <WorkflowEditorPage {...props} />
    </Suspense>
  </ErrorBoundary>
);

const LazyIntegrations = (props: any) => (
  <Suspense fallback={<RouteLoader />}>
    <IntegrationsPage {...props} />
  </Suspense>
);

const WorkflowExecutionHistoryPage = lazy(
  () => import("@/pages/workflow-execution-history-page")
);

const LazyExecutionHistory = (props: any) => (
  <Suspense fallback={<RouteLoader />}>
    <WorkflowExecutionHistoryPage {...props} />
  </Suspense>
);

const WorkflowExecutionDetailPage = lazy(
  () => import("@/pages/workflow-execution-detail-page")
);

const LazyExecutionDetail = (props: any) => (
  <Suspense fallback={<RouteLoader />}>
    <WorkflowExecutionDetailPage {...props} />
  </Suspense>
);

const WorkflowTemplatesPage = lazy(
  () => import("@/pages/workflow-templates-page")
);

const LazyWorkflowTemplates = (props: any) => (
  <Suspense fallback={<RouteLoader />}>
    <WorkflowTemplatesPage {...props} />
  </Suspense>
);

const WorkflowAnalyticsPage = lazy(
  () => import("@/pages/workflow-analytics-page")
);

const LazyWorkflowAnalytics = (props: any) => (
  <Suspense fallback={<RouteLoader />}>
    <WorkflowAnalyticsPage {...props} />
  </Suspense>
);

const WorkflowMarketplacePage = lazy(
  () => import("@/pages/workflow-marketplace-page")
);

const LazyWorkflowMarketplace = (props: any) => (
  <Suspense fallback={<RouteLoader />}>
    <WorkflowMarketplacePage {...props} />
  </Suspense>
);

const WorkflowCreatorEarningsPage = lazy(
  () => import("@/pages/workflow-creator-earnings-page")
);

const LazyWorkflowEarnings = (props: any) => (
  <Suspense fallback={<RouteLoader />}>
    <WorkflowCreatorEarningsPage {...props} />
  </Suspense>
);

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/explore" component={ExplorePage} />
      <Route path="/fxn/:slug" component={FxnPage} />
      <Route path="/privacy" component={PrivacyPolicyPage} />
      <Route path="/terms" component={TermsOfServicePage} />
      <Route path="/security" component={SecurityPage} />
      <ProtectedRoute path="/dashboard" component={LazyDashboard} />
      <ProtectedRoute path="/settings" component={LazySettings} />
      <ProtectedRoute path="/profile" component={LazyProfile} />
      <ProtectedRoute path="/support" component={LazySupport} />
      <ProtectedRoute path="/create-tool" component={LazyToolBuilder} />
      <ProtectedRoute path="/admin" component={LazyAdminDashboard} />
      <ProtectedRoute path="/subscription" component={LazySubscription} />
      <ProtectedRoute path="/earnings" component={LazyEarnings} />
      <ProtectedRoute path="/purchases" component={LazyPurchases} />
      <ProtectedRoute path="/billing/:id" component={LazyBillingDetail} />
      <ProtectedRoute path="/billing" component={LazyBillingHistory} />
      <ProtectedRoute
        path="/email-preferences"
        component={LazyEmailPreferences}
      />
      <ProtectedRoute
        path="/workflows/:workflowId/executions/:executionId"
        component={LazyExecutionDetail}
      />
      <ProtectedRoute
        path="/workflows/:id/executions"
        component={LazyExecutionHistory}
      />
      <ProtectedRoute
        path="/workflows/:id/analytics"
        component={LazyWorkflowAnalytics}
      />
      <ProtectedRoute path="/workflows/:id" component={LazyWorkflowEditor} />
      <ProtectedRoute path="/workflows" component={LazyWorkflows} />
      <ProtectedRoute path="/tools" component={LazyTools} />
      <ProtectedRoute
        path="/workflow-templates"
        component={LazyWorkflowTemplates}
      />
      <ProtectedRoute
        path="/workflow-marketplace"
        component={LazyWorkflowMarketplace}
      />
      <ProtectedRoute
        path="/workflow-earnings"
        component={LazyWorkflowEarnings}
      />
      <ProtectedRoute path="/integrations" component={LazyIntegrations} />
      <Route path="/checkout/success" component={LazyCheckoutSuccess} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary
      onError={(e, info) =>
        console.error("Application Error Boundary triggered:", e, info)
      }
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <SidebarProvider>
              <AuthDialogProvider>
                <FxnsSidebar />

                <SidebarInset>
                  {/* top bar (optional) */}
                  
                  <SidebarTrigger />

                  {/* growable content area */}
                  <div className="flex-1 min-w-0">
                    <NavigationHeader />
                    <Router />
                  </div>

                  {/* footer sits after content: bottom of viewport if short, scrolls off if long */}
                  <Footer />

                  {/* app-level helpers */}
                  <Toaster />
                  <PWAInstallPrompt />
                  <ReloadPrompt />
                </SidebarInset>
              </AuthDialogProvider>
            </SidebarProvider>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
