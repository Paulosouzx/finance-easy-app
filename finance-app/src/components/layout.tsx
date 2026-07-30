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
  BellOff,
  LogOut,
  Check,
  X,
  Users,
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
import { useTranslation, type TranslationKey } from "@/lib/i18n";

type NavItem = {
  href: string;
  labelKey: TranslationKey;
  moduleKey: string;
  icon: React.ComponentType<{ className?: string }>;
  alwaysOn?: boolean;
};

const ALL_NAV_ITEMS: NavItem[] = [
  { href: "/", labelKey: "nav.dashboard", moduleKey: "dashboard", icon: LayoutDashboard, alwaysOn: true },
  { href: "/transactions", labelKey: "nav.transactions", moduleKey: "transactions", icon: ArrowLeftRight, alwaysOn: true },
  { href: "/accounts", labelKey: "nav.accounts", moduleKey: "accounts", icon: Landmark, alwaysOn: true },
  { href: "/credit-cards", labelKey: "nav.creditCards", moduleKey: "credit-cards", icon: CreditCard },
  { href: "/bills", labelKey: "nav.bills", moduleKey: "bills", icon: Receipt },
  { href: "/budgets", labelKey: "nav.budgets", moduleKey: "budgets", icon: PieChart },
  { href: "/goals", labelKey: "nav.goals", moduleKey: "goals", icon: Target },
  { href: "/categories", labelKey: "nav.categories", moduleKey: "categories", icon: Tags },
  { href: "/reports", labelKey: "nav.reports", moduleKey: "reports", icon: BarChart3 },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { isModuleEnabled } = useUserPreferences();
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const t = useTranslation();

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
    if (location === "/") return t("nav.dashboard");
    if (location.startsWith("/settings")) return t("nav.settings");
    const found = ALL_NAV_ITEMS.find(i => i.href !== "/" && location.startsWith(i.href));
    return found ? t(found.labelKey) : location.split("/")[1].replace(/-/g, " ");
  })();

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Sidebar */}
      <aside className="w-60 border-r bg-sidebar hidden md:flex flex-col">
        <div className="h-14 flex items-center px-5 border-b border-sidebar-border">
          <Link href="/" className="flex items-center gap-2 text-primary font-bold text-base tracking-tight">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-xs font-black">F</span>
            </div>
            FinanceApp
          </Link>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {t(item.labelKey)}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <Link href="/settings">
            <div className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              location.startsWith("/settings")
                ? "bg-primary text-primary-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            }`}>
              <Settings className="w-4 h-4 shrink-0" />
              {t("nav.settings")}
            </div>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b bg-card/50 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold capitalize">{pageTitle}</h1>
          </div>

          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
                  <Bell className="w-5 h-5" />
                  {!!invites?.length && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 flex items-center justify-center text-[10px] font-semibold text-primary-foreground bg-primary rounded-full ring-2 ring-background">
                      {invites.length}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-96 p-0 overflow-hidden">
                <div className="px-4 py-3 border-b bg-muted/30">
                  <p className="text-sm font-semibold">{t("header.invitesTitle")}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("header.invitesSubtitle")}</p>
                </div>
                {!invites?.length ? (
                  <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                    <BellOff className="w-6 h-6 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">{t("header.noInvites")}</p>
                  </div>
                ) : (
                  <div className="divide-y max-h-80 overflow-y-auto">
                    {invites.map((invite) => (
                      <div key={invite.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors">
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Users className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm truncate">
                            {t("header.inviteFor")} <span className="font-semibold">{invite.account_name}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">{t("header.sharedAccountManagement")}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-500"
                            onClick={() => handleRespond(invite.id, true)}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8 border-rose-500/30 text-rose-500 hover:bg-rose-500/10 hover:text-rose-500"
                            onClick={() => handleRespond(invite.id, false)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
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
                    {t("nav.settings")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer text-rose-500 focus:text-rose-500">
                  <LogOut className="w-4 h-4 mr-2" />
                  {t("header.signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="flex-1 p-5 overflow-y-auto">
          <div className="max-w-6xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
