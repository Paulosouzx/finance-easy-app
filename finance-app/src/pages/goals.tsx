import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getGoals } from "@/services/goals";
import { Plus, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { format, differenceInMonths } from "date-fns";

export default function Goals() {
  const { data: goals, isLoading } = useQuery({ queryKey: ["goals"], queryFn: getGoals });

  const enriched = useMemo(() => {
    if (!goals) return [];
    return goals.map(g => {
      const current = Number(g.current_amount ?? 0);
      const target = Number(g.target_amount ?? 0);
      const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
      const monthsLeft = g.deadline ? Math.max(differenceInMonths(new Date(g.deadline), new Date()), 1) : null;
      const remaining = target - current;
      const monthlyRequired = monthsLeft && remaining > 0 ? remaining / monthsLeft : null;
      return { ...g, percentage, monthlyRequired };
    });
  }, [goals]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Savings Goals</h2>
          <p className="text-muted-foreground">Plan for the future and track your progress.</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Goal
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-2xl" />)
        ) : enriched.length === 0 ? (
          <div className="col-span-full p-8 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed">No active savings goals found.</div>
        ) : (
          enriched.map(goal => (
            <Card key={goal.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10 text-primary">
                      <Target className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{goal.name}</h4>
                      {goal.deadline && (
                        <p className="text-xs text-muted-foreground">By {format(new Date(goal.deadline), "MMM yyyy")}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium">${Number(goal.current_amount).toFixed(2)}</span>
                      <span className="text-muted-foreground">of ${Number(goal.target_amount).toFixed(2)}</span>
                    </div>
                    <Progress value={goal.percentage} className="h-2" />
                  </div>
                  {goal.monthlyRequired && (
                    <p className="text-xs text-muted-foreground text-center pt-2 border-t">
                      Need <span className="font-medium text-foreground">${goal.monthlyRequired.toFixed(2)}</span> / mo to reach goal
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}