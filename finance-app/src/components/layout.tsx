import { useState } from "react";
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
  Menu,
  PiggyBank,
  Plus,
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useUserPreferences } from "@/contexts/user-preferences";
import { useAuth } from "@/contexts/auth";
import { getProfile } from "@/services/profile";
import { getPendingInvites, respondToInvite, type PendingInvite } from "@/services/accounts";
import { ensurePushSubscription } from "@/services/push";
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
  const [moreOpen, setMoreOpen] = useState(false);
  const [selectedInvite, setSelectedInvite] = useState<PendingInvite | null>(null);
  const [responding, setResponding] = useState(false);
  const { isModuleEnabled } = useUserPreferences();
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const t = useTranslation();

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const { data: invites } = useQuery({ queryKey: ["pending-invites"], queryFn: getPendingInvites });

  const visibleItems = ALL_NAV_ITEMS.filter(
    item => item.alwaysOn || isModuleEnabled(item.moduleKey)
  );

  const tabItems = visibleItems.filter(item => item.alwaysOn);
  const moreItems = visibleItems.filter(item => !item.alwaysOn);

  const displayName = profile?.name || user?.email?.split("@")[0] || "Utilizador";
  const initial = displayName.charAt(0).toUpperCase();

  async function handleRespond(memberId: string, accept: boolean) {
    setResponding(true);
    try {
      await respondToInvite(memberId, accept);
      queryClient.invalidateQueries({ queryKey: ["pending-invites"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setSelectedInvite(null);
      // Ao aceitar a partilha, ativa notificações push para avisar quando o outro
      // utilizador mexer na conta partilhada. Falha em silêncio (ex: permissão
      // negada) — a aceitação do convite não deve ficar bloqueada por isto.
      if (accept) ensurePushSubscription().catch(() => {});
    } finally {
      setResponding(false);
    }
  }

  const pageTitle = (() => {
    if (location === "/") return t("nav.dashboard");
    if (location.startsWith("/settings")) return t("nav.settings");
    const found = ALL_NAV_ITEMS.find(i => i.href !== "/" && location.startsWith(i.href));
    return found ? t(found.labelKey) : location.split("/")[1].replace(/-/g, " ");
  })();

  return (
    <div className="h-dvh flex w-full bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 border-r bg-sidebar hidden md:flex flex-col shrink-0">
        <div className="h-14 flex items-center px-5 border-b border-sidebar-border shrink-0">
          <Link href="/" className="flex items-center gap-2 text-primary font-bold text-base tracking-tight">
            <span className="w-7 h-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center shrink-0">
              <PiggyBank className="w-4 h-4" strokeWidth={1.5} />
            </span>
            Finance Easy
          </Link>
        </div>

        <div className="px-3 pt-3 shrink-0">
          <Link href="/transactions?new=1">
            <div className="flex items-center justify-center gap-2 w-full h-11 rounded-lg bg-primary text-primary-foreground text-sm font-semibold cursor-pointer hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4" />
              Nova Transação
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-1.5 overflow-y-auto">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {t(item.labelKey)}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border shrink-0">
          <Link href="/settings">
            <div className={`flex items-center gap-3 px-3.5 py-3 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              location.startsWith("/settings")
                ? "bg-primary text-primary-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            }`}>
              <Settings className="w-5 h-5 shrink-0" />
              {t("nav.settings")}
            </div>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="h-14 border-b bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 md:px-6 sticky top-0 z-10">
          <div className="flex items-center gap-4 min-w-0">
            <Link href="/" className="flex items-center gap-2 text-primary font-bold md:hidden shrink-0">
              <span className="w-7 h-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
                <PiggyBank className="w-4 h-4" strokeWidth={1.5} />
              </span>
            </Link>
            <h1 className="text-lg font-semibold capitalize truncate">{pageTitle}</h1>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
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
                            onClick={() => setSelectedInvite(invite)}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8 border-rose-500/30 text-rose-500 hover:bg-rose-500/10 hover:text-rose-500"
                            onClick={() => setSelectedInvite(invite)}
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

        <div className="flex-1 p-4 md:p-5 pb-24 md:pb-5 overflow-y-auto">
          <div className="max-w-6xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-card/95 backdrop-blur-sm border-t flex items-stretch"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {tabItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className="flex-1">
              <div
                className={`flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
                {t(item.labelKey)}
              </div>
            </Link>
          );
        })}
        <button
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium ${
            moreOpen || location.startsWith("/settings") || moreItems.some(i => location.startsWith(i.href))
              ? "text-primary"
              : "text-muted-foreground"
          }`}
          onClick={() => setMoreOpen(true)}
        >
          <Menu className="w-5 h-5" />
          {t("nav.more")}
        </button>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="md:hidden rounded-t-xl max-h-[70vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t("nav.more")}</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-3 pt-2">
            {moreItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href} onClick={() => setMoreOpen(false)}>
                  <div
                    className={`flex flex-col items-center justify-center gap-2 rounded-lg border p-3 text-xs font-medium ${
                      isActive ? "bg-primary text-primary-foreground border-primary" : "text-foreground"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {t(item.labelKey)}
                  </div>
                </Link>
              );
            })}
            <Link href="/settings" onClick={() => setMoreOpen(false)}>
              <div
                className={`flex flex-col items-center justify-center gap-2 rounded-lg border p-3 text-xs font-medium ${
                  location.startsWith("/settings") ? "bg-primary text-primary-foreground border-primary" : "text-foreground"
                }`}
              >
                <Settings className="w-5 h-5" />
                {t("nav.settings")}
              </div>
            </Link>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={!!selectedInvite} onOpenChange={(open) => !open && setSelectedInvite(null)}>
        <DialogContent className="sm:max-w-sm">
          {selectedInvite && (
            <>
              <DialogHeader>
                <DialogTitle>{t("header.inviteModalTitle")}</DialogTitle>
                <DialogDescription>{t("header.inviteModalDescription")}</DialogDescription>
              </DialogHeader>

              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={selectedInvite.inviter_avatar_url ?? undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {(selectedInvite.inviter_name || selectedInvite.inviter_email || "?").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{t("header.invitedBy")}</p>
                  <p className="text-sm font-semibold truncate">
                    {selectedInvite.inviter_name || selectedInvite.inviter_email || t("header.unknownInviter")}
                  </p>
                  {selectedInvite.inviter_name && selectedInvite.inviter_email && (
                    <p className="text-xs text-muted-foreground truncate">{selectedInvite.inviter_email}</p>
                  )}
                </div>
              </div>

              <p className="text-sm">
                {t("header.inviteFor")} <span className="font-semibold">{selectedInvite.account_name}</span>
              </p>

              <DialogFooter className="gap-2 sm:gap-2">
                <Button variant="outline" onClick={() => setSelectedInvite(null)} disabled={responding}>
                  {t("header.cancel")}
                </Button>
                <Button
                  variant="outline"
                  className="border-rose-500/30 text-rose-500 hover:bg-rose-500/10 hover:text-rose-500"
                  onClick={() => handleRespond(selectedInvite.id, false)}
                  disabled={responding}
                >
                  {t("header.decline")}
                </Button>
                <Button onClick={() => handleRespond(selectedInvite.id, true)} disabled={responding}>
                  {t("header.accept")}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
