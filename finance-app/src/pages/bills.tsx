import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getBills, payBill } from "@/services/bills";
import { getAccounts } from "@/services/accounts";
import { Plus, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format, differenceInCalendarDays } from "date-fns";

export default function Bills() {
  const queryClient = useQueryClient();
  const { data: bills, isLoading } = useQuery({ queryKey: ["bills"], queryFn: getBills });
  const { data: accounts } = useQuery({ queryKey: ["accounts"], queryFn: getAccounts });

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

  async function handleMarkPaid(billId: string) {
    const defaultAccountId = accounts?.[0]?.id;
    if (!defaultAccountId) return;
    await payBill(billId, defaultAccountId);
    queryClient.invalidateQueries({ queryKey: ["bills"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["accounts"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Bills</h2>
          <p className="text-muted-foreground">Keep track of your upcoming and overdue bills.</p>
        </div>
        <Button className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Add Bill
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2"><AlertCircle className="w-5 h-5" /><p className="font-medium">Overdue</p></div>
            <h3 className="text-2xl font-bold">${overdueTotal.toFixed(2)}</h3>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2"><Clock className="w-5 h-5" /><p className="font-medium">Upcoming</p></div>
            <h3 className="text-2xl font-bold">${upcomingTotal.toFixed(2)}</h3>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2"><CheckCircle2 className="w-5 h-5" /><p className="font-medium">Paid this month</p></div>
            <h3 className="text-2xl font-bold">${paidTotal.toFixed(2)}</h3>
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
              <div className="p-8 text-center text-muted-foreground">No bills found. Add one to get started.</div>
            ) : (
              enriched.map((bill) => (
                <div key={bill.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                      <Receipt className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium leading-none">{bill.name}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-muted-foreground">{format(new Date(bill.due_date), "MMM d, yyyy")}</span>
                        {bill.status === "paid" ? (
                          <Badge variant="outline" className="text-[10px] h-4 px-1 bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Paid</Badge>
                        ) : bill.isOverdue ? (
                          <Badge variant="outline" className="text-[10px] h-4 px-1 bg-rose-500/10 text-rose-500 border-rose-500/20">Overdue by {Math.abs(bill.daysUntilDue)} days</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] h-4 px-1 bg-amber-500/10 text-amber-500 border-amber-500/20">In {bill.daysUntilDue} days</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right"><div className="font-semibold">${Number(bill.amount).toFixed(2)}</div></div>
                    {bill.status !== "paid" && (
                      <Button size="sm" variant="outline" className="hidden sm:flex" onClick={() => handleMarkPaid(bill.id)}>Mark Paid</Button>
                    )}
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

function Receipt(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" /><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" /><path d="M12 17.5v-11" /></svg>;
}