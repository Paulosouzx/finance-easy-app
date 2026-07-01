import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getBudgets } from "@/services/budgets";
import { getTransactions } from "@/services/transactions";
import { Plus, PieChart, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function Budgets() {
  const currentMonth = format(new Date(), "yyyy-MM");
  const { data: budgets, isLoading } = useQuery({ queryKey: ["budgets", currentMonth], queryFn: () => getBudgets(currentMonth) });
  const { data: transactions } = useQuery({ queryKey: ["transactions", currentMonth], queryFn: () => getTransactions({ month: currentMonth, type: "expense" }) });

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Budgets</h2>
          <p className="text-muted-foreground">Monitor your spending limits for this month.</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Budget
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)
        ) : enriched.length === 0 ? (
          <div className="col-span-full p-8 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed">No budgets set up for this month.</div>
        ) : (
          enriched.map(budget => {
            const cat = (budget as any).categories;
            const statusColor = budget.status === "exceeded" ? "bg-rose-500" : budget.status === "warning" ? "bg-amber-500" : "bg-emerald-500";

            return (
              <Card key={budget.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: cat?.color ? `${cat.color}20` : "var(--secondary)", color: cat?.color || "var(--foreground)" }}>
                        <PieChart className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{cat?.name || "Unnamed Category"}</h4>
                        <p className="text-xs text-muted-foreground">Limit: ${Number(budget.limit_amount).toFixed(2)}</p>
                      </div>
                    </div>
                    {budget.status === "exceeded" && <AlertCircle className="w-5 h-5 text-rose-500" />}
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Spent: ${budget.spentAmount.toFixed(2)}</span>
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