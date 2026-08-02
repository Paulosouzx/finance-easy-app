import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTransactions } from "@/services/transactions";
import { getAccounts } from "@/services/accounts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format, subMonths } from "date-fns";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, BarChart, Bar, Legend } from "recharts";
import { formatCurrency } from "@/lib/currency";
import { useUserPreferences } from "@/contexts/user-preferences";
import { AccountTabs } from "@/components/account-tabs";

export default function Reports() {
  const [months] = useState(6);
  const { currency } = useUserPreferences();
  const { data: transactions, isLoading } = useQuery({ queryKey: ["transactions"], queryFn: () => getTransactions() });
  const { data: accounts } = useQuery({ queryKey: ["accounts"], queryFn: getAccounts });
  const [selectedAccountTab, setSelectedAccountTab] = useState("");

  useEffect(() => {
    if (!selectedAccountTab && accounts?.length) {
      setSelectedAccountTab(accounts[0].id);
    }
  }, [accounts, selectedAccountTab]);

  const scopedTransactions = useMemo(() => {
    if (!transactions || !selectedAccountTab) return [];
    return transactions.filter(t => t.account_id === selectedAccountTab);
  }, [transactions, selectedAccountTab]);

  const evolution = useMemo(() => {
    if (!transactions) return [];
    return Array.from({ length: months }, (_, i) => subMonths(new Date(), months - 1 - i)).map(monthDate => {
      const key = format(monthDate, "yyyy-MM");
      const income = scopedTransactions.filter(t => t.date.startsWith(key) && t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
      const expenses = scopedTransactions.filter(t => t.date.startsWith(key) && t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
      return { label: format(monthDate, "MMM yy"), income, expenses, balance: income - expenses };
    });
  }, [scopedTransactions, months]);

  const expensesByCategory = useMemo(() => {
    if (!transactions) return [];
    const grouped = new Map<string, { name: string; color: string | null; amount: number }>();
    scopedTransactions.filter(t => t.type === "expense").forEach(t => {
      const cat = (t as any).categories;
      const key = t.category_id || "uncategorized";
      const existing = grouped.get(key);
      if (existing) {
        existing.amount += Number(t.amount);
      } else {
        grouped.set(key, { name: cat?.name || "Sem categoria", color: cat?.color || null, amount: Number(t.amount) });
      }
    });
    return Array.from(grouped.values()).sort((a, b) => b.amount - a.amount).slice(0, 8);
  }, [scopedTransactions]);

  const totalIncome = evolution.reduce((s, m) => s + m.income, 0);
  const totalExpenses = evolution.reduce((s, m) => s + m.expenses, 0);
  const totalBalance = totalIncome - totalExpenses;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Relatórios</h2>
        <p className="text-muted-foreground">Analisa o teu desempenho financeiro ao longo do tempo.</p>
      </div>

      <AccountTabs accounts={accounts ?? []} value={selectedAccountTab} onChange={setSelectedAccountTab} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Receita Total", value: totalIncome, color: "text-emerald-500" },
          { label: "Despesa Total", value: totalExpenses, color: "text-rose-500" },
          { label: "Saldo Líquido", value: totalBalance, color: totalBalance >= 0 ? "text-emerald-500" : "text-rose-500" },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              {isLoading ? <Skeleton className="h-8 w-24 mt-2" /> : (
                <h3 className={`text-2xl font-bold mt-2 ${color}`}>{formatCurrency(Math.abs(value), currency)}</h3>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Receitas vs Despesas</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-[300px] w-full" /> : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={evolution} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={v => formatCurrency(v, currency)} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }} formatter={(v: number) => [formatCurrency(v, currency), undefined]} />
                  <Legend />
                  <Bar dataKey="income" name="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Fluxo de Caixa</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[250px] w-full" /> : (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={evolution} margin={{ top: 10, right: 10, left: 4, bottom: 0 }}>
                    <defs>
                      <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7B2FF7" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#7B2FF7" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} width={80} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={v => formatCurrency(v, currency)} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }} formatter={(v: number) => [formatCurrency(v, currency), undefined]} />
                    <Area type="monotone" dataKey="balance" name="Saldo" stroke="#7B2FF7" strokeWidth={2} fill="url(#balanceGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Despesas por Categoria</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[250px] w-full" /> : expensesByCategory.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">Sem dados de despesas disponíveis.</div>
            ) : (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={expensesByCategory} dataKey="amount" cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} stroke="none">
                      {expensesByCategory.map((entry, i) => (
                        <Cell key={i} fill={entry.color || `hsl(var(--chart-${(i % 5) + 1}))`} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [formatCurrency(v, currency), undefined]} contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2 max-h-[60px] overflow-y-auto">
                  {expensesByCategory.slice(0, 4).map((e, i) => (
                    <div key={i} className="flex items-center justify-between text-xs min-w-0">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: e.color || "hsl(var(--primary))" }} />
                        <span className="truncate">{e.name}</span>
                      </div>
                      <span className="font-medium shrink-0">{formatCurrency(e.amount, currency)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}