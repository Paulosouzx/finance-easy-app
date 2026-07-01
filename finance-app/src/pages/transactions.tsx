import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTransactions } from "@/services/transactions";
import { format } from "date-fns";
import { Plus, ArrowDownRight, ArrowUpRight, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Transactions() {
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const { data: transactions, isLoading } = useQuery({
    queryKey: ["transactions", month],
    queryFn: () => getTransactions({ month }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Transactions</h2>
          <p className="text-muted-foreground">Manage your income and expenses.</p>
        </div>
        <Button className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Add Transaction
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-b gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search transactions..." className="pl-9 bg-muted/50 border-none" />
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
              <div className="p-8 text-center text-muted-foreground">No transactions found for this period.</div>
            ) : (
              transactions?.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === "income" ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
                      {tx.type === "income" ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-medium">{tx.description || (tx as any).categories?.name || "Transaction"}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">{format(new Date(tx.date), "MMM d, yyyy")}</span>
                        {(tx as any).credit_cards?.name && (
                          <>
                            <span className="text-xs text-muted-foreground">&bull;</span>
                            <span className="text-xs text-muted-foreground">{(tx as any).credit_cards.name}</span>
                          </>
                        )}
                        {tx.status === "pending" && (
                          <Badge variant="outline" className="text-[10px] h-4 px-1 ml-1 bg-amber-500/10 text-amber-500 border-amber-500/20">Pending</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold ${tx.type === "income" ? "text-emerald-500" : ""}`}>
                      {tx.type === "income" ? "+" : "-"}${Math.abs(Number(tx.amount)).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}