import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAccounts, createAccount, getAccountMembers, inviteAccountMember, removeAccountMember } from "@/services/accounts";
import { Plus, Landmark, CreditCard, Building2, Wallet, HandCoins, Users, X, Loader2 } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [addOpen, setAddOpen] = useState(false);
  const [shareAccountId, setShareAccountId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", type: "checking", institution: "", balance: "0", currency: "EUR" });

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: getAccounts,
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createAccount({
        name: form.name,
        type: form.type,
        institution: form.institution || null,
        balance: Number(form.balance) || 0,
        currency: form.currency,
        color: null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setAddOpen(false);
      setForm({ name: "", type: "checking", institution: "", balance: "0", currency: "EUR" });
    },
    onError: (err) => {
      toast({ title: "Não foi possível criar a conta", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    },
  });

  const totalBalance = accounts?.reduce((sum, acc) => sum + Number(acc.balance), 0) || 0;
  const shareAccount = accounts?.find(a => a.id === shareAccountId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Contas</h2>
          <p className="text-muted-foreground">Gere as tuas contas bancárias, carteiras e dívidas partilhadas.</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Nova Conta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova conta</DialogTitle>
              <DialogDescription>
                Contas do tipo "Dívida" podem ser partilhadas com um segundo utilizador para gestão conjunta.
              </DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate();
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
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Criar conta
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-primary text-primary-foreground border-none">
        <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-primary-foreground/80 font-medium">Saldo Total</p>
            <h3 className="text-4xl font-bold mt-2">
              {isLoading ? <Skeleton className="h-10 w-32 bg-primary-foreground/20" /> : `€${totalBalance.toFixed(2)}`}
            </h3>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-4">
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
          <div className="col-span-full p-8 text-center text-muted-foreground bg-muted/20 border border-dashed rounded-xl">
            Nenhuma conta encontrada. Cria uma para começar.
          </div>
        ) : (
          accounts?.map((account) => {
            const Icon = getAccountIcon(account.type ?? "");
            const isOwner = account.owner_id === user?.id;
            return (
              <Card key={account.id} className="hover:border-primary/50 transition-colors group">
                <CardContent className="p-6">
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
                    {!isOwner && (
                      <Badge variant="outline" className="text-[10px]">Partilhada</Badge>
                    )}
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
    </div>
  );
}

function ShareAccountDialog({ accountId, accountName }: { accountId: string; accountName: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [email, setEmail] = useState("");

  const { data: members, isLoading } = useQuery({
    queryKey: ["account-members", accountId],
    queryFn: () => getAccountMembers(accountId),
  });

  const inviteMutation = useMutation({
    mutationFn: () => inviteAccountMember(accountId, email),
    onSuccess: () => {
      setEmail("");
      queryClient.invalidateQueries({ queryKey: ["account-members", accountId] });
      toast({ title: "Convite enviado", description: `${email} foi convidado a gerir esta conta.` });
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

  return (
    <>
      <DialogHeader>
        <DialogTitle>Partilhar "{accountName}"</DialogTitle>
        <DialogDescription>
          Convida um segundo utilizador por email para gerir esta conta em conjunto. Assim que aceitar, verá as
          transações e o saldo em sincronização com a tua conta.
        </DialogDescription>
      </DialogHeader>

      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (email.trim()) inviteMutation.mutate();
        }}
      >
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="invite-email">Email do convidado</Label>
          <Input id="invite-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="pessoa@exemplo.com" />
        </div>
        <Button type="submit" disabled={inviteMutation.isPending}>
          {inviteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Convidar
        </Button>
      </form>

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
