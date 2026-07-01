import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UserPreferencesProvider } from "@/contexts/user-preferences";
import { AuthProvider } from "@/contexts/auth";
import { Layout } from "@/components/layout";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import NotFound from "@/pages/not-found";

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

const queryClient = new QueryClient();

function Router() {
  return (
    <UserPreferencesProvider>
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
          <Route component={NotFound} />
        </Switch>
      </Layout>
      <PwaInstallPrompt />
    </UserPreferencesProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
