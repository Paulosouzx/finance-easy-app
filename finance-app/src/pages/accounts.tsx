import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAccounts, createAccount, updateAccount, deleteAccount, getAccountMembers, inviteAccountMember, removeAccountMember, searchUsers, type ProfileSearchResult } from "@/services/accounts";
import { getTransactions } from "@/services/transactions";
import { Plus, Landmark, CreditCard, Building2, Wallet, HandCoins, Users, X, Loader2, Search, UserPlus, Pencil, Trash2, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/auth";
import { useToast } from "@/hooks/use-toast";

const ACCOUNT_TYPES = [
  { value: "checking", label: "Conta à Ordem" },
  { value: "savings", label: "Poupança" },
  { value: "wallet", label: "Carteira" },
  { value: "investment", label: "Investimento" },
  { value: "debt", label: "Dívida (partilhável)" },
  { value: "other", label: "Outra" },
];

function getAccountIcon(type: string) {
  switch (type) {
    case "checking": return Landmark;
    case "savings": return Building2;
    case "investment": return CreditCard;
    case "debt": return HandCoins;
    default: return Wallet;
  }
}

export default function Accounts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [shareAccountId, setShareAccountId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", type: "checking", institution: "", balance: "0", currency: "EUR" });

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: getAccounts,
    enabled: !!user,
  });

  const { data: transactions } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => getTransactions(),
    enabled: !!user,
  });

  const emergencyFundTotal = useMemo(() => {
    if (!transactions) return 0;
    return transactions
      .filter((t) => t.type === "savings" || (t as any).categories?.type === "savings")
      .reduce((sum, t) => sum + Number(t.amount), 0);
  }, [transactions]);

  function openCreate() {
    setEditingId(null);
    setForm({ name: "", type: "checking", institution: "", balance: "0", currency: "EUR" });
    setModalOpen(true);
  }

  function openEdit(account: NonNullable<typeof accounts>[number]) {
    setEditingId(account.id);
    setForm({
      name: account.name ?? "",
      type: account.type ?? "checking",
      institution: account.institution ?? "",
      balance: String(account.balance ?? "0"),
      currency: account.currency ?? "EUR",
    });
    setModalOpen(true);
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name,
        type: form.type,
        institution: form.institution || null,
        balance: Number(form.balance) || 0,
        currency: form.currency,
        color: null,
      };
      if (editingId) return updateAccount(editingId, payload);
      return createAccount(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setModalOpen(false);
      setEditingId(null);
      setForm({ name: "", type: "checking", institution: "", balance: "0", currency: "EUR" });
    },
    onError: (err) => {
      toast({ title: "Não foi possível guardar a conta", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setDeleteId(null);
    },
    onError: (err) => {
      toast({ title: "Não foi possível eliminar a conta", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    },
  });

  const totalBalance = accounts?.reduce((sum, acc) => sum + Number(acc.balance), 0) || 0;
  const shareAccount = accounts?.find(a => a.id === shareAccountId);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Contas</h2>
          <p className="text-muted-foreground">Gere as tuas contas bancárias, carteiras e dívidas partilhadas.</p>
        </div>
        <Dialog open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) setEditingId(null); }}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Conta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar conta" : "Nova conta"}</DialogTitle>
              <DialogDescription>
                Contas do tipo "Dívida" podem ser partilhadas com um segundo utilizador para gestão conjunta.
              </DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate();
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="account-name">Nome</Label>
                <Input id="account-name" required value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="account-institution">Instituição (opcional)</Label>
                <Input id="account-institution" value={form.institution} onChange={(e) => setForm(f => ({ ...f, institution: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="account-balance">Saldo inicial</Label>
                <Input id="account-balance" type="number" step="0.01" value={form.balance} onChange={(e) => setForm(f => ({ ...f, balance: e.target.value }))} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingId ? "Guardar Alterações" : "Criar conta"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-primary text-primary-foreground border-none">
        <CardContent className="p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-primary-foreground/80 font-medium text-sm">Saldo Total</p>
            <h3 className="text-3xl font-bold mt-1.5">
              {isLoading ? <Skeleton className="h-9 w-32 bg-primary-foreground/20" /> : `€${totalBalance.toFixed(2)}`}
            </h3>
            {emergencyFundTotal > 0 && (
              <p className="flex items-center gap-1.5 text-xs text-primary-foreground/70 mt-2">
                <PiggyBank className="w-3.5 h-3.5" />
                Fundo de Emergência: €{emergencyFundTotal.toFixed(2)}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                </div>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))
        ) : accounts?.length === 0 ? (
          <div className="col-span-full p-6 text-center text-muted-foreground bg-muted/20 border border-dashed rounded-xl">
            Nenhuma conta encontrada. Cria uma para começar.
          </div>
        ) : (
          accounts?.map((account) => {
            const Icon = getAccountIcon(account.type ?? "");
            const isOwner = account.owner_id === user?.id;
            return (
              <Card key={account.id} className="hover:border-primary/50 transition-colors group">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center bg-secondary text-secondary-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                        style={{ backgroundColor: account.color ? `${account.color}20` : undefined, color: account.color || undefined }}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold leading-none">{account.name}</p>
                        <p className="text-xs text-muted-foreground mt-1.5 capitalize">{account.type} &bull; {account.institution || "Outra"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!isOwner && (
                        <Badge variant="outline" className="text-[10px] mr-1">Partilhada</Badge>
                      )}
                      {isOwner && (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(account)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(account.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-end justify-between">
                    <h4 className="text-2xl font-bold">€{Number(account.balance).toFixed(2)}</h4>
                    {isOwner && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground"
                        onClick={() => setShareAccountId(account.id)}
                      >
                        <Users className="w-4 h-4 mr-1.5" />
                        Partilhar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={!!shareAccountId} onOpenChange={(open) => !open && setShareAccountId(null)}>
        <DialogContent>
          {shareAccount && <ShareAccountDialog accountId={shareAccount.id} accountName={shareAccount.name} />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId != null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar conta?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação é permanente. As transações associadas a esta conta não serão eliminadas.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ShareAccountDialog({ accountId, accountName }: { accountId: string; accountName: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { data: members, isLoading } = useQuery({
    queryKey: ["account-members", accountId],
    queryFn: () => getAccountMembers(accountId),
  });

  const { data: results, isFetching: isSearching } = useQuery({
    queryKey: ["user-search", debouncedQuery],
    queryFn: () => searchUsers(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  });

  const invitedEmails = new Set(members?.map((m) => m.invited_email));

  const inviteMutation = useMutation({
    mutationFn: (target: ProfileSearchResult | { email: string; id?: null }) =>
      inviteAccountMember(accountId, target.email ?? "", target.id ?? null),
    onSuccess: (_data, target) => {
      setQuery("");
      setDebouncedQuery("");
      queryClient.invalidateQueries({ queryKey: ["account-members", accountId] });
      toast({ title: "Convite enviado", description: `${target.email} foi convidado a gerir esta conta.` });
    },
    onError: (err) => {
      toast({ title: "Não foi possível convidar", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => removeAccountMember(memberId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["account-members", accountId] }),
  });

  const statusLabel: Record<string, string> = { pending: "Pendente", accepted: "Aceite", declined: "Recusado" };
  const looksLikeEmail = /^\S+@\S+\.\S+$/.test(query.trim());
  const alreadyInvited = looksLikeEmail && invitedEmails.has(query.trim().toLowerCase());

  return (
    <>
      <DialogHeader>
        <DialogTitle>Partilhar "{accountName}"</DialogTitle>
        <DialogDescription>
          Pesquisa por nome, username ou email para convidar alguém a gerir esta conta em conjunto. Assim que
          aceitar, verá as transações e o saldo em sincronização com a tua conta.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-1.5">
        <Label htmlFor="invite-search">Convidar utilizador</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="invite-search"
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nome, username ou email"
          />
        </div>

        {debouncedQuery.length >= 2 && (
          <div className="rounded-lg border divide-y max-h-56 overflow-y-auto">
            {isSearching ? (
              <div className="p-3"><Skeleton className="h-8 w-full" /></div>
            ) : results?.length ? (
              results.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  disabled={inviteMutation.isPending || invitedEmails.has((r.email ?? "").toLowerCase())}
                  onClick={() => inviteMutation.mutate(r)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={r.avatar_url ?? undefined} />
                    <AvatarFallback>{r.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="font-medium truncate">{r.name}</p>
                    <p className="text-xs text-muted-foreground/80 truncate">@{r.username}</p>
                    <p className="text-[11px] text-muted-foreground/60 truncate">{r.email}</p>
                  </div>
                  {invitedEmails.has((r.email ?? "").toLowerCase()) ? (
                    <Badge variant="outline" className="text-[10px] shrink-0">Já convidado</Badge>
                  ) : (
                    <UserPlus className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                </button>
              ))
            ) : looksLikeEmail ? (
              <button
                type="button"
                disabled={inviteMutation.isPending || alreadyInvited}
                onClick={() => inviteMutation.mutate({ email: query.trim() })}
                className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted/50 disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="flex-1 truncate">
                  {alreadyInvited ? "Já convidado: " : "Convidar por email: "}
                  <span className="font-medium">{query.trim()}</span>
                </span>
              </button>
            ) : (
              <p className="px-3 py-3 text-sm text-muted-foreground">Sem utilizadores encontrados.</p>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2 pt-2">
        <Label className="text-muted-foreground text-xs uppercase">Membros</Label>
        {isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : !members?.length ? (
          <p className="text-sm text-muted-foreground">Ainda não convidaste ninguém.</p>
        ) : (
          <div className="divide-y rounded-lg border">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="truncate">{m.invited_email}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant="outline"
                    className={
                      m.status === "accepted"
                        ? "text-emerald-500 border-emerald-500/30"
                        : m.status === "declined"
                        ? "text-rose-500 border-rose-500/30"
                        : "text-amber-500 border-amber-500/30"
                    }
                  >
                    {statusLabel[m.status] ?? m.status}
                  </Badge>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeMutation.mutate(m.id)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
