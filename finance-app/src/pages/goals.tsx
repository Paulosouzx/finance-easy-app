import { useGetGoals } from "@workspace/api-client-react";
import { Plus, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function Goals() {
  const { data: goals, isLoading } = useGetGoals();

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
        ) : goals?.length === 0 ? (
          <div className="col-span-full p-8 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed">No active savings goals found.</div>
        ) : (
          goals?.map(goal => (
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
                        <p className="text-xs text-muted-foreground">By {format(new Date(goal.deadline), 'MMM yyyy')}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium">${goal.currentAmount.toFixed(2)}</span>
                      <span className="text-muted-foreground">of ${goal.targetAmount.toFixed(2)}</span>
                    </div>
                    <Progress value={goal.percentage || 0} className="h-2" />
                  </div>
                  {goal.monthlyRequired && (
                    <p className="text-xs text-muted-foreground text-center pt-2 border-t mt-2">
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
