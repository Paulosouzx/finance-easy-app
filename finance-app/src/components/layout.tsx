import { Link, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  LogOut,
  Check,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUserPreferences } from "@/contexts/user-preferences";
import { useAuth } from "@/contexts/auth";
import { getProfile } from "@/services/profile";
import { getPendingInvites, respondToInvite } from "@/services/accounts";

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
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const { data: invites } = useQuery({ queryKey: ["pending-invites"], queryFn: getPendingInvites });

  const visibleItems = ALL_NAV_ITEMS.filter(
    item => item.alwaysOn || isModuleEnabled(item.moduleKey)
  );

  const displayName = profile?.name || user?.email?.split("@")[0] || "Utilizador";
  const initial = displayName.charAt(0).toUpperCase();

  async function handleRespond(memberId: string, accept: boolean) {
    await respondToInvite(memberId, accept);
    queryClient.invalidateQueries({ queryKey: ["pending-invites"] });
    queryClient.invalidateQueries({ queryKey: ["accounts"] });
  }

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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
                  <Bell className="w-5 h-5" />
                  {!!invites?.length && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Convites de partilha de conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {!invites?.length ? (
                  <p className="px-2 py-3 text-sm text-muted-foreground">Sem convites pendentes.</p>
                ) : (
                  invites.map((invite) => (
                    <div key={invite.id} className="flex items-center justify-between gap-2 px-2 py-2 text-sm">
                      <span className="truncate">
                        Convite para <span className="font-medium">{invite.accounts?.name ?? "conta"}</span>
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-500" onClick={() => handleRespond(invite.id, true)}>
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-500" onClick={() => handleRespond(invite.id, false)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="h-8 w-px bg-border" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 cursor-pointer">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium leading-none">{displayName}</p>
                    <p className="text-xs text-muted-foreground mt-1">{user?.email}</p>
                  </div>
                  <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                    <AvatarImage src={profile?.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">{initial}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="cursor-pointer">
                    <Settings className="w-4 h-4 mr-2" />
                    Definições
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer text-rose-500 focus:text-rose-500">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
