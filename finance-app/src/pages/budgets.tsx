import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getBudgets, createBudget } from "@/services/budgets";
import { getTransactions } from "@/services/transactions";
import { getCategories } from "@/services/categories";
import { Plus, PieChart, AlertCircle, Loader2 } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function Budgets() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const currentMonth = format(new Date(), "yyyy-MM");
  const [addOpen, setAddOpen] = useState(false);
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

  const createMutation = useMutation({
    mutationFn: () =>
      createBudget({
        category_id: form.category_id,
        month: currentMonth,
        limit_amount: Number(form.limit_amount) || 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets", currentMonth] });
      setAddOpen(false);
      setForm({ category_id: "", limit_amount: "" });
    },
    onError: (err) => {
      toast({ title: "Não foi possível criar o orçamento", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Orçamentos</h2>
          <p className="text-muted-foreground">Acompanha os teus limites de gastos deste mês.</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Novo Orçamento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo orçamento</DialogTitle>
              <DialogDescription>Define um limite de gasto mensal para uma categoria.</DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (form.category_id) createMutation.mutate();
              }}
            >
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select value={form.category_id} onValueChange={(v) => setForm(f => ({ ...f, category_id: v }))}>
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
                <Button type="submit" disabled={createMutation.isPending || !form.category_id}>
                  {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Criar orçamento
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
              <Card key={budget.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: cat?.color ? `${cat.color}20` : "var(--secondary)", color: cat?.color || "var(--foreground)" }}>
                        <PieChart className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{cat?.name || "Categoria sem nome"}</h4>
                        <p className="text-xs text-muted-foreground">Limite: €{Number(budget.limit_amount).toFixed(2)}</p>
                      </div>
                    </div>
                    {budget.status === "exceeded" && <AlertCircle className="w-5 h-5 text-rose-500" />}
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
    </div>
  );
}
