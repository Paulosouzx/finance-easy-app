import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getBudgets, createBudget, updateBudget, deleteBudget } from "@/services/budgets";
import { getTransactions } from "@/services/transactions";
import { getCategories } from "@/services/categories";
import { Plus, PieChart, AlertCircle, Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import { format } from "date-fns";

export default function Budgets() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const currentMonth = format(new Date(), "yyyy-MM");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ category_id: "", limit_amount: "" });

  const { data: budgets, isLoading } = useQuery({ queryKey: ["budgets", currentMonth], queryFn: () => getBudgets(currentMonth) });
  const { data: transactions } = useQuery({ queryKey: ["transactions", currentMonth], queryFn: () => getTransactions({ month: currentMonth, type: "expense" }) });
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: getCategories });
  const expenseCategories = categories?.filter(c => c.type !== "income") ?? [];

  const enriched = useMemo(() => {
    if (!budgets) return [];
    return budgets.map(b => {
      const spent = (transactions ?? [])
        .filter(t => t.category_id === b.category_id)
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const limit = Number(b.limit_amount);
      const percentage = limit > 0 ? (spent / limit) * 100 : 0;
      const status = percentage >= 100 ? "exceeded" : percentage >= 80 ? "warning" : "ok";
      return { ...b, spentAmount: spent, percentage, status };
    });
  }, [budgets, transactions]);

  function openCreate() {
    setEditingId(null);
    setForm({ category_id: "", limit_amount: "" });
    setModalOpen(true);
  }

  function openEdit(budget: NonNullable<typeof budgets>[number]) {
    setEditingId(budget.id);
    setForm({
      category_id: budget.category_id ?? "",
      limit_amount: String(budget.limit_amount ?? ""),
    });
    setModalOpen(true);
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      if (editingId) return updateBudget(editingId, { limit_amount: Number(form.limit_amount) || 0 });
      return createBudget({
        category_id: form.category_id,
        month: currentMonth,
        limit_amount: Number(form.limit_amount) || 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets", currentMonth] });
      setModalOpen(false);
      setEditingId(null);
      setForm({ category_id: "", limit_amount: "" });
    },
    onError: (err) => {
      toast({ title: "Não foi possível guardar o orçamento", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBudget(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets", currentMonth] });
      setDeleteId(null);
    },
    onError: (err) => {
      toast({ title: "Não foi possível eliminar o orçamento", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Orçamentos</h2>
          <p className="text-muted-foreground">Acompanha os teus limites de gastos deste mês.</p>
        </div>
        <Dialog open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) setEditingId(null); }}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Orçamento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar orçamento" : "Novo orçamento"}</DialogTitle>
              <DialogDescription>Define um limite de gasto mensal para uma categoria.</DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (form.category_id) saveMutation.mutate();
              }}
            >
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select value={form.category_id} onValueChange={(v) => setForm(f => ({ ...f, category_id: v }))} disabled={!!editingId}>
                  <SelectTrigger><SelectValue placeholder="Escolhe uma categoria" /></SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="budget-limit">Limite mensal</Label>
                <Input id="budget-limit" type="number" step="0.01" required value={form.limit_amount} onChange={(e) => setForm(f => ({ ...f, limit_amount: e.target.value }))} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saveMutation.isPending || !form.category_id}>
                  {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingId ? "Guardar Alterações" : "Criar orçamento"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)
        ) : enriched.length === 0 ? (
          <div className="col-span-full p-6 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed">Nenhum orçamento definido para este mês.</div>
        ) : (
          enriched.map(budget => {
            const cat = (budget as any).categories;
            const statusColor = budget.status === "exceeded" ? "bg-rose-500" : budget.status === "warning" ? "bg-amber-500" : "bg-emerald-500";

            return (
              <Card key={budget.id} className="hover:border-primary/50 transition-colors group cursor-pointer" onClick={() => openEdit(budget)}>
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: cat?.color ? `${cat.color}20` : "var(--secondary)", color: cat?.color || "var(--foreground)" }}>
                        <PieChart className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold truncate">{cat?.name || "Categoria sem nome"}</h4>
                        <p className="text-xs text-muted-foreground">Limite: €{Number(budget.limit_amount).toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {budget.status === "exceeded" && <AlertCircle className="w-5 h-5 text-rose-500 mr-1" />}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); openEdit(budget); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteId(budget.id); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Gasto: €{budget.spentAmount.toFixed(2)}</span>
                      <span className="font-medium">{budget.percentage.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div className={`h-full ${statusColor} transition-all`} style={{ width: `${Math.min(budget.percentage, 100)}%` }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <AlertDialog open={deleteId != null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar orçamento?</AlertDialogTitle>
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
