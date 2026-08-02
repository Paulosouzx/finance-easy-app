import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getBudgets, createBudget, updateBudget, deleteBudget } from "@/services/budgets";
import { EmptyStateIllustration } from "@/components/empty-state-illustration";
import { getTransactions } from "@/services/transactions";
import { getCategories } from "@/services/categories";
import { Plus, PieChart as PieChartIcon, AlertCircle, Loader2, Pencil, Trash2, BarChart3, CircleDot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";
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

type BudgetChartType = "bar" | "donut";

const CHART_TYPE_OPTIONS: { value: BudgetChartType; label: string; icon: typeof BarChart3 }[] = [
  { value: "bar", label: "Barras", icon: BarChart3 },
  { value: "donut", label: "Rosca", icon: CircleDot },
];

const STATUS_COLOR = { exceeded: "#f43f5e", warning: "#f59e0b", ok: "#10b981" } as const;

function BudgetBarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 shadow-md">
      <p className="text-sm font-medium mb-1">{label}</p>
      {payload.map((entry: any) => {
        const color = entry.dataKey === "gasto" ? STATUS_COLOR[entry.payload.status as keyof typeof STATUS_COLOR] : "hsl(var(--muted-foreground))";
        return (
          <p key={entry.dataKey} className="text-sm" style={{ color }}>
            {entry.name}: €{Number(entry.value).toFixed(2)}
          </p>
        );
      })}
    </div>
  );
}

export default function Budgets() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const currentMonth = format(new Date(), "yyyy-MM");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ category_id: "", limit_amount: "" });
  const [chartType, setChartType] = useState<BudgetChartType>("bar");

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

  const chartData = useMemo(() => {
    return enriched.map(b => {
      const cat = (b as any).categories;
      return {
        name: cat?.name || "Sem categoria",
        gasto: b.spentAmount,
        limite: Number(b.limit_amount),
        color: cat?.color || "hsl(var(--primary))",
        status: b.status as keyof typeof STATUS_COLOR,
      };
    });
  }, [enriched]);

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

      {!isLoading && enriched.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
            <CardTitle>Gasto vs. Limite</CardTitle>
            <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5">
              {CHART_TYPE_OPTIONS.map(({ value, label, icon: Icon }) => (
                <Button
                  key={value}
                  type="button"
                  variant="ghost"
                  size="icon"
                  title={label}
                  onClick={() => setChartType(value)}
                  className={cn(
                    "h-7 w-7 text-muted-foreground hover:text-foreground",
                    chartType === value && "bg-background text-foreground shadow-sm"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === "bar" ? (
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} dy={10} interval={0} angle={chartData.length > 4 ? -20 : 0} textAnchor={chartData.length > 4 ? "end" : "middle"} height={chartData.length > 4 ? 50 : 30} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={(value) => `€${value}`} />
                    <Tooltip content={<BudgetBarTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="gasto" name="Gasto" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`gasto-${index}`} fill={STATUS_COLOR[entry.status]} />
                      ))}
                    </Bar>
                    <Bar dataKey="limite" name="Limite" fill="hsl(var(--muted-foreground))" fillOpacity={0.25} radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : (
                  <PieChart>
                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="gasto" nameKey="name" stroke="none">
                      {chartData.map((entry, index) => (
                        <Cell key={`donut-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                      formatter={(value: number) => [`€${value.toFixed(2)}`, undefined]}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)
        ) : enriched.length === 0 ? (
          <div className="col-span-full flex flex-col items-center p-10 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
            <EmptyStateIllustration />
            Nenhum orçamento definido para este mês.
          </div>
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
                        <PieChartIcon className="w-5 h-5" />
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
