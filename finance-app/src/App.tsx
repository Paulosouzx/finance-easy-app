import { useEffect, useRef, useState } from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UserPreferencesProvider } from "@/contexts/user-preferences";
import { AuthProvider, useAuth } from "@/contexts/auth";
import { PwaInstallProvider } from "@/contexts/pwa-install";
import { Layout } from "@/components/layout";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";

import Dashboard from "@/pages/dashboard";
import Transactions from "@/pages/transactions";
import Accounts from "@/pages/accounts";
import Bills from "@/pages/bills";
import CreditCards from "@/pages/credit-cards";
import Budgets from "@/pages/budgets";
import Goals from "@/pages/goals";
import Categories from "@/pages/categories";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import { PiggyBank } from "lucide-react";

const queryClient = new QueryClient();

function FullScreenSpinner() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-primary">
      <PiggyBank className="w-16 h-16 text-primary-foreground" strokeWidth={1.5} />
    </div>
  );
}

function AuthenticatedRouter() {
  useRealtimeSync();
  return (
    <>
      <Layout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/transactions" component={Transactions} />
          <Route path="/accounts" component={Accounts} />
          <Route path="/credit-cards" component={CreditCards} />
          <Route path="/bills" component={Bills} />
          <Route path="/budgets" component={Budgets} />
          <Route path="/goals" component={Goals} />
          <Route path="/categories" component={Categories} />
          <Route path="/reports" component={Reports} />
          <Route path="/settings" component={Settings} />
          <Route path="/login">{() => <Redirect to="/" />}</Route>
          <Route path="/auth/callback">{() => <Redirect to="/" />}</Route>
          <Route component={NotFound} />
        </Switch>
      </Layout>
      <PwaInstallPrompt />
    </>
  );
}

function Router() {
  const { user, loading } = useAuth();
  const [justSignedIn, setJustSignedIn] = useState(false);
  const wasSignedIn = useRef(false);

  useEffect(() => {
    if (!wasSignedIn.current && user) {
      setJustSignedIn(true);
      const timer = setTimeout(() => setJustSignedIn(false), 800);
      wasSignedIn.current = true;
      return () => clearTimeout(timer);
    }
    wasSignedIn.current = !!user;
    return undefined;
  }, [user]);

  if (loading || justSignedIn) return <FullScreenSpinner />;

  if (!user) {
    return (
      <Switch>
        <Route path="/auth/callback">
          <FullScreenSpinner />
        </Route>
        <Route component={Login} />
      </Switch>
    );
  }

  return <AuthenticatedRouter />;
}

function App() {
  return (
    <PwaInstallProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <UserPreferencesProvider>
            <TooltipProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <Router />
              </WouterRouter>
              <Toaster />
            </TooltipProvider>
          </UserPreferencesProvider>
        </AuthProvider>
      </QueryClientProvider>
    </PwaInstallProvider>
  );
}

export default App;
