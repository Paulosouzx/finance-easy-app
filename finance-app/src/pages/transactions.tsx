import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getTransactions, createTransaction, updateTransaction, deleteTransaction } from "@/services/transactions";
import { getAccounts } from "@/services/accounts";
import { getCategories } from "@/services/categories";
import { getCreditCards } from "@/services/creditCards";
import { format } from "date-fns";
import { Plus, ArrowDownRight, ArrowUpRight, Search, Filter, Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";

const EMPTY_FORM = {
  type: "expense" as "income" | "expense",
  description: "",
  amount: "",
  date: format(new Date(), "yyyy-MM-dd"),
  category_id: "",
  account_id: "",
  card_id: "",
};

export default function Transactions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["transactions", month],
    queryFn: () => getTransactions({ month }),
  });
  const { data: accounts } = useQuery({ queryKey: ["accounts"], queryFn: getAccounts });
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: getCategories });
  const { data: cards } = useQuery({ queryKey: ["credit-cards"], queryFn: getCreditCards });
  const filteredCategories = categories?.filter(c => c.type === form.type || c.type === "both") ?? [];

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(tx: NonNullable<typeof transactions>[number]) {
    setEditingId(tx.id);
    setForm({
      type: tx.type as "income" | "expense",
      description: tx.description ?? "",
      amount: String(tx.amount ?? ""),
      date: tx.date,
      category_id: tx.category_id ?? "",
      account_id: tx.account_id ?? "",
      card_id: tx.card_id ?? "",
    });
    setModalOpen(true);
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!form.account_id) throw new Error("Escolhe uma conta");
      const payload = {
        account_id: form.account_id,
        category_id: form.category_id || null,
        card_id: form.card_id || null,
        amount: Number(form.amount) || 0,
        type: form.type,
        description: form.description,
        date: form.date,
      };
      if (editingId) {
        return updateTransaction(editingId, payload);
      }
      return createTransaction({ ...payload, status: "paid", recurrence: "once", tags: [] });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setModalOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
    },
    onError: (err) => {
      toast({ title: "Não foi possível guardar a transação", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setDeleteId(null);
    },
    onError: (err) => {
      toast({ title: "Não foi possível eliminar a transação", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Transações</h2>
          <p className="text-muted-foreground">Gere as tuas receitas e despesas.</p>
        </div>
        <Dialog open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) setEditingId(null); }}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Transação
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar transação" : "Nova transação"}</DialogTitle>
              <DialogDescription>{editingId ? "Atualiza os dados desta transação." : "Regista uma receita ou despesa."}</DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate();
              }}
            >
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={form.type === "expense" ? "default" : "outline"}
                  onClick={() => setForm(f => ({ ...f, type: "expense", category_id: "" }))}
                >
                  Despesa
                </Button>
                <Button
                  type="button"
                  variant={form.type === "income" ? "default" : "outline"}
                  onClick={() => setForm(f => ({ ...f, type: "income", category_id: "" }))}
                >
                  Receita
                </Button>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tx-description">Descrição</Label>
                <Input id="tx-description" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Ex: Supermercado" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="tx-amount">Valor</Label>
                  <Input id="tx-amount" type="number" step="0.01" required value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tx-date">Data</Label>
                  <Input id="tx-date" type="date" required value={form.date} onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select value={form.category_id} onValueChange={(v) => setForm(f => ({ ...f, category_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>
                    {filteredCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Conta</Label>
                <Select value={form.account_id} onValueChange={(v) => setForm(f => ({ ...f, account_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Escolhe uma conta" /></SelectTrigger>
                  <SelectContent>
                    {accounts?.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {!!cards?.length && (
                <div className="space-y-1.5">
                  <Label>Cartão de crédito</Label>
                  <Select value={form.card_id} onValueChange={(v) => setForm(f => ({ ...f, card_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                    <SelectContent>
                      {cards.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <DialogFooter>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingId ? "Guardar Alterações" : "Criar transação"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-b gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Pesquisar transações..." className="pl-9 bg-muted/50 border-none" />
              </div>
              <Button variant="outline" size="icon" className="shrink-0">
                <Filter className="w-4 h-4" />
              </Button>
            </div>
            <div className="w-full sm:w-auto">
              <Input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full sm:w-40"
              />
            </div>
          </div>

          <div className="divide-y">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-3 w-1/6" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))
            ) : transactions?.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">Nenhuma transação encontrada para este período.</div>
            ) : (
              transactions?.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between gap-3 p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => openEdit(tx)}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${tx.type === "income" ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
                      {tx.type === "income" ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{tx.description || (tx as any).categories?.name || "Transação"}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">{format(new Date(tx.date), "dd MMM yyyy")}</span>
                        {(tx as any).credit_cards?.name && (
                          <>
                            <span className="text-xs text-muted-foreground">&bull;</span>
                            <span className="text-xs text-muted-foreground">{(tx as any).credit_cards.name}</span>
                          </>
                        )}
                        {tx.status === "pending" && (
                          <Badge variant="outline" className="text-[10px] h-4 px-1 ml-1 bg-amber-500/10 text-amber-500 border-amber-500/20">Pendente</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <div className="text-right mr-1">
                      <div className={`font-semibold ${tx.type === "income" ? "text-emerald-500" : ""}`}>
                        {tx.type === "income" ? "+" : "-"}€{Math.abs(Number(tx.amount)).toFixed(2)}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={(e) => { e.stopPropagation(); openEdit(tx); }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); setDeleteId(tx.id); }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteId != null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar transação?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação é permanente e não pode ser desfeita.</AlertDialogDescription>
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
