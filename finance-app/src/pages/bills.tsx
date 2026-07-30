import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getBills, payBill, createBill, updateBill, deleteBill } from "@/services/bills";
import { getAccounts } from "@/services/accounts";
import { getCategories } from "@/services/categories";
import { Plus, CheckCircle2, AlertCircle, Clock, Loader2, Pencil, Trash2 } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { format, differenceInCalendarDays } from "date-fns";

const RECURRENCE_LABELS: Record<string, string> = {
  once: "Uma vez",
  weekly: "Semanal",
  monthly: "Mensal",
  yearly: "Anual",
};

export default function Bills() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", amount: "", due_date: "", category_id: "", account_id: "", recurrence: "monthly" });

  const { data: bills, isLoading } = useQuery({ queryKey: ["bills"], queryFn: getBills });
  const { data: accounts } = useQuery({ queryKey: ["accounts"], queryFn: getAccounts });
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: getCategories });
  const expenseCategories = categories?.filter(c => c.type !== "income") ?? [];

  const enriched = useMemo(() => {
    if (!bills) return [];
    const today = new Date();
    return bills.map(b => {
      const daysUntilDue = differenceInCalendarDays(new Date(b.due_date), today);
      return { ...b, daysUntilDue, isOverdue: daysUntilDue < 0 };
    });
  }, [bills]);

  const overdueTotal = enriched.filter(b => b.isOverdue && b.status !== "paid").reduce((s, b) => s + Number(b.amount), 0);
  const upcomingTotal = enriched.filter(b => !b.isOverdue && b.status !== "paid").reduce((s, b) => s + Number(b.amount), 0);
  const paidTotal = enriched.filter(b => b.status === "paid").reduce((s, b) => s + Number(b.amount), 0);

  function openCreate() {
    setEditingId(null);
    setForm({ name: "", amount: "", due_date: "", category_id: "", account_id: "", recurrence: "monthly" });
    setModalOpen(true);
  }

  function openEdit(bill: NonNullable<typeof bills>[number]) {
    setEditingId(bill.id);
    setForm({
      name: bill.name ?? "",
      amount: String(bill.amount ?? ""),
      due_date: bill.due_date,
      category_id: bill.category_id ?? "",
      account_id: bill.account_id ?? "",
      recurrence: bill.recurrence ?? "monthly",
    });
    setModalOpen(true);
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name,
        amount: Number(form.amount) || 0,
        due_date: form.due_date,
        category_id: form.category_id || null,
        account_id: form.account_id || null,
        recurrence: form.recurrence,
      };
      if (editingId) return updateBill(editingId, payload);
      return createBill({ ...payload, status: "pending" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      setModalOpen(false);
      setEditingId(null);
      setForm({ name: "", amount: "", due_date: "", category_id: "", account_id: "", recurrence: "monthly" });
    },
    onError: (err) => {
      toast({ title: "Não foi possível guardar a conta a pagar", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBill(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      setDeleteId(null);
    },
    onError: (err) => {
      toast({ title: "Não foi possível eliminar a conta a pagar", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    },
  });

  const payMutation = useMutation({
    mutationFn: (billId: string) => {
      const defaultAccountId = accounts?.[0]?.id;
      if (!defaultAccountId) throw new Error("Nenhuma conta disponível");
      return payBill(billId, defaultAccountId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: (err) => {
      toast({ title: "Não foi possível marcar como paga", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Contas a Pagar</h2>
          <p className="text-muted-foreground">Acompanha as tuas contas pendentes e em atraso.</p>
        </div>
        <Dialog open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) setEditingId(null); }}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Conta a Pagar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar conta a pagar" : "Nova conta a pagar"}</DialogTitle>
              <DialogDescription>Regista uma despesa recorrente ou pontual para não perderes o prazo.</DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate();
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="bill-name">Nome</Label>
                <Input id="bill-name" required value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Renda, eletricidade, ginásio..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="bill-amount">Valor</Label>
                  <Input id="bill-amount" type="number" step="0.01" required value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bill-due">Vencimento</Label>
                  <Input id="bill-due" type="date" required value={form.due_date} onChange={(e) => setForm(f => ({ ...f, due_date: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select value={form.category_id} onValueChange={(v) => setForm(f => ({ ...f, category_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Conta associada</Label>
                <Select value={form.account_id} onValueChange={(v) => setForm(f => ({ ...f, account_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>
                    {accounts?.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Recorrência</Label>
                <Select value={form.recurrence} onValueChange={(v) => setForm(f => ({ ...f, recurrence: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(RECURRENCE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingId ? "Guardar Alterações" : "Criar conta a pagar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2"><AlertCircle className="w-5 h-5" /><p className="font-medium">Em atraso</p></div>
            <h3 className="text-2xl font-bold">€{overdueTotal.toFixed(2)}</h3>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2"><Clock className="w-5 h-5" /><p className="font-medium">Por vencer</p></div>
            <h3 className="text-2xl font-bold">€{upcomingTotal.toFixed(2)}</h3>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2"><CheckCircle2 className="w-5 h-5" /><p className="font-medium">Pagas este mês</p></div>
            <h3 className="text-2xl font-bold">€{paidTotal.toFixed(2)}</h3>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-3 w-1/6" /></div>
                </div>
              ))
            ) : enriched.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">Nenhuma conta a pagar encontrada. Cria uma para começar.</div>
            ) : (
              enriched.map((bill) => (
                <div key={bill.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => openEdit(bill)}>
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <Receipt className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium leading-none truncate">{bill.name}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-xs text-muted-foreground">{format(new Date(bill.due_date), "dd MMM yyyy")}</span>
                        {bill.status === "paid" ? (
                          <Badge variant="outline" className="text-[10px] h-4 px-1 bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Paga</Badge>
                        ) : bill.isOverdue ? (
                          <Badge variant="outline" className="text-[10px] h-4 px-1 bg-rose-500/10 text-rose-500 border-rose-500/20">Atrasada há {Math.abs(bill.daysUntilDue)} dias</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] h-4 px-1 bg-amber-500/10 text-amber-500 border-amber-500/20">Em {bill.daysUntilDue} dias</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right"><div className="font-semibold">€{Number(bill.amount).toFixed(2)}</div></div>
                    {bill.status !== "paid" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={payMutation.isPending}
                        onClick={(e) => { e.stopPropagation(); payMutation.mutate(bill.id); }}
                      >
                        {payMutation.isPending && payMutation.variables === bill.id ? (
                          <Loader2 className="w-4 h-4 animate-spin sm:mr-2" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 sm:mr-2" />
                        )}
                        <span className="hidden sm:inline">Marcar como paga</span>
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); openEdit(bill); }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteId(bill.id); }}>
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
            <AlertDialogTitle>Eliminar conta a pagar?</AlertDialogTitle>
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

function Receipt(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" /><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" /><path d="M12 17.5v-11" /></svg>;
}
