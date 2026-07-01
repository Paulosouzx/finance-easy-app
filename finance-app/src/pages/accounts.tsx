import { useQuery } from "@tanstack/react-query";
import { getAccounts } from "@/services/accounts";
import { Plus, Landmark, CreditCard, Building2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Accounts() {
  const { data: accounts, isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: getAccounts,
  });

  const getAccountIcon = (type: string) => {
    switch (type) {
      case "checking": return Landmark;
      case "savings": return Building2;
      case "credit": return CreditCard;
      default: return Wallet;
    }
  };

  const totalBalance = accounts?.reduce((sum, acc) => sum + Number(acc.balance), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Accounts</h2>
          <p className="text-muted-foreground">Manage your bank accounts and wallets.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto">Transfer</Button>
          <Button className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Account
          </Button>
        </div>
      </div>

      <Card className="bg-primary text-primary-foreground border-none">
        <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-primary-foreground/80 font-medium">Total Balance</p>
            <h3 className="text-4xl font-bold mt-2">
              {isLoading ? <Skeleton className="h-10 w-32 bg-primary-foreground/20" /> : `$${totalBalance.toFixed(2)}`}
            </h3>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                </div>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))
        ) : accounts?.length === 0 ? (
          <div className="col-span-full p-8 text-center text-muted-foreground bg-muted/20 border border-dashed rounded-xl">
            No accounts found. Add one to get started.
          </div>
        ) : (
          accounts?.map((account) => {
            const Icon = getAccountIcon(account.type ?? "");
            return (
              <Card key={account.id} className="hover:border-primary/50 transition-colors cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center bg-secondary text-secondary-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                        style={{ backgroundColor: account.color ? `${account.color}20` : undefined, color: account.color || undefined }}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold leading-none">{account.name}</p>
                        <p className="text-xs text-muted-foreground mt-1.5 capitalize">{account.type} &bull; {account.institution || "Other"}</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold">${Number(account.balance).toFixed(2)}</h4>
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