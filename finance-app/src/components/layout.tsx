import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Landmark,
  CreditCard,
  Receipt,
  PieChart,
  Target,
  Tags,
  BarChart3,
  Settings,
  Bell,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useUserPreferences } from "@/contexts/user-preferences";

type NavItem = {
  href: string;
  label: string;
  moduleKey: string;
  icon: React.ComponentType<{ className?: string }>;
  alwaysOn?: boolean;
};

const ALL_NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", moduleKey: "dashboard", icon: LayoutDashboard, alwaysOn: true },
  { href: "/transactions", label: "Transações", moduleKey: "transactions", icon: ArrowLeftRight, alwaysOn: true },
  { href: "/accounts", label: "Contas", moduleKey: "accounts", icon: Landmark, alwaysOn: true },
  { href: "/credit-cards", label: "Cartões de Crédito", moduleKey: "credit-cards", icon: CreditCard },
  { href: "/bills", label: "Contas a Pagar", moduleKey: "bills", icon: Receipt },
  { href: "/budgets", label: "Orçamentos", moduleKey: "budgets", icon: PieChart },
  { href: "/goals", label: "Metas", moduleKey: "goals", icon: Target },
  { href: "/categories", label: "Categorias", moduleKey: "categories", icon: Tags },
  { href: "/reports", label: "Relatórios", moduleKey: "reports", icon: BarChart3 },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { isModuleEnabled } = useUserPreferences();

  const visibleItems = ALL_NAV_ITEMS.filter(
    item => item.alwaysOn || isModuleEnabled(item.moduleKey)
  );

  const pageTitle = (() => {
    if (location === "/") return "Dashboard";
    const found = ALL_NAV_ITEMS.find(i => i.href !== "/" && location.startsWith(i.href));
    return found?.label ?? location.split("/")[1].replace(/-/g, " ");
  })();

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-sidebar hidden md:flex flex-col">
        <div className="p-6">
          <Link href="/" className="flex items-center gap-2 text-primary font-bold text-xl tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-sm font-black">F</span>
            </div>
            FinanceApp
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <Link href="/settings">
            <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              location.startsWith("/settings")
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            }`}>
              <Settings className="w-5 h-5 shrink-0" />
              Definições
            </div>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b bg-card/50 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold capitalize">{pageTitle}</h1>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
            </Button>

            <div className="h-8 w-px bg-border" />

            <div className="flex items-center gap-3 cursor-pointer">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium leading-none">Utilizador</p>
                <p className="text-xs text-muted-foreground mt-1">Conta Pessoal</p>
              </div>
              <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                <AvatarImage src="" />
                <AvatarFallback className="bg-primary/10 text-primary font-medium">U</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-6xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
