import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCreditCards } from "@/services/creditCards";
import { getTransactions } from "@/services/transactions";
import { Plus, CreditCard as CardIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

export default function CreditCards() {
  const { data: cards, isLoading } = useQuery({ queryKey: ["credit-cards"], queryFn: getCreditCards });
  const { data: transactions } = useQuery({ queryKey: ["transactions"], queryFn: () => getTransactions() });

  const enriched = useMemo(() => {
    if (!cards) return [];
    return cards.map(card => {
      const usedAmount = (transactions ?? [])
        .filter(t => t.card_id === card.id && t.status === "pending")
        .reduce((sum, t) => sum + Number(t.amount), 0);
      return { ...card, usedAmount };
    });
  }, [cards, transactions]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Credit Cards</h2>
          <p className="text-muted-foreground">Manage your credit cards and invoices.</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Card
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)
        ) : enriched.length === 0 ? (
          <div className="col-span-full p-8 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed">No cards found. Add one to get started.</div>
        ) : (
          enriched.map(card => {
            const limit = Number(card.credit_limit ?? 0);
            const usedPercentage = limit > 0 ? Math.min((card.usedAmount / limit) * 100, 100) : 0;
            return (
              <Card key={card.id} className="relative overflow-hidden group hover:border-primary/50 transition-all">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-2">
                      <CardIcon className="w-5 h-5 text-muted-foreground" />
                      <span className="font-semibold">{card.name}</span>
                    </div>
                    {card.brand && (
                      <span className="text-xs font-medium px-2 py-1 rounded bg-secondary text-secondary-foreground uppercase">{card.brand}</span>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-muted-foreground">Limit used</span>
                        <span className="font-medium">${card.usedAmount.toFixed(2)} / ${limit.toFixed(2)}</span>
                      </div>
                      <Progress value={usedPercentage} className="h-2" />
                    </div>
                    <div className="flex justify-between text-sm pt-4 border-t">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-xs">Closes</span>
                        <span className="font-medium">Day {card.closing_day}</span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-muted-foreground text-xs">Due</span>
                        <span className="font-medium">Day {card.due_day}</span>
                      </div>
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