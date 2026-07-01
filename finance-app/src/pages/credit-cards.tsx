import { useGetCreditCards } from "@workspace/api-client-react";
import { Plus, CreditCard as CardIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

export default function CreditCards() {
  const { data: cards, isLoading } = useGetCreditCards();
  
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
        ) : cards?.length === 0 ? (
          <div className="col-span-full p-8 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed">No cards found. Add one to get started.</div>
        ) : (
          cards?.map(card => {
            const usedPercentage = Math.min((card.usedAmount / card.limit) * 100, 100);
            return (
            <Card key={card.id} className="relative overflow-hidden group hover:border-primary/50 transition-all">
              <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: card.color || 'var(--primary)' }} />
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-2">
                    <CardIcon className="w-5 h-5 text-muted-foreground" />
                    <span className="font-semibold">{card.name}</span>
                  </div>
                  {card.brand && <span className="text-xs font-medium px-2 py-1 rounded bg-secondary text-secondary-foreground uppercase">{card.brand}</span>}
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-muted-foreground">Limit used</span>
                      <span className="font-medium">${card.usedAmount.toFixed(2)} / ${card.limit.toFixed(2)}</span>
                    </div>
                    <Progress value={usedPercentage} className="h-2" />
                  </div>
                  <div className="flex justify-between text-sm pt-4 border-t">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-xs">Closes</span>
                      <span className="font-medium">Day {card.closingDay}</span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-muted-foreground text-xs">Due</span>
                      <span className="font-medium">Day {card.dueDay}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )})
        )}
      </div>
    </div>
  );
}
