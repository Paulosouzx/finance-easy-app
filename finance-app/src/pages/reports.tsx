import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTransactions } from "@/services/transactions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format, subMonths } from "date-fns";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, BarChart, Bar, Legend } from "recharts";

export default function Reports() {
  const [months] = useState(6);
  const { data: transactions, isLoading } = useQuery({ queryKey: ["transactions"], queryFn: () => getTransactions() });

  const evolution = useMemo(() => {
    if (!transactions) return [];
    return Array.from({ length: months }, (_, i) => subMonths(new Date(), months - 1 - i)).map(monthDate => {
      const key = format(monthDate, "yyyy-MM");
      const income = transactions.filter(t => t.date.startsWith(key) && t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
      const expenses = transactions.filter(t => t.date.startsWith(key) && t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
      return { label: format(monthDate, "MMM yy"), income, expenses, balance: income - expenses };
    });
  }, [transactions, months]);

  const expensesByCategory = useMemo(() => {
    if (!transactions) return [];
    const grouped = new Map<string, { name: string; color: string | null; amount: number }>();
    transactions.filter(t => t.type === "expense").forEach(t => {
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
  }, [transactions]);

  const totalIncome = evolution.reduce((s, m) => s + m.income, 0);
  const totalExpenses = evolution.reduce((s, m) => s + m.expenses, 0);
  const totalBalance = totalIncome - totalExpenses;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Reports</h2>
        <p className="text-muted-foreground">Analyze your financial performance over time.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Total Income", value: totalIncome, color: "text-emerald-500" },
          { label: "Total Expenses", value: totalExpenses, color: "text-rose-500" },
          { label: "Net Balance", value: totalBalance, color: totalBalance >= 0 ? "text-emerald-500" : "text-rose-500" },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              {isLoading ? <Skeleton className="h-8 w-24 mt-2" /> : (
                <h3 className={`text-2xl font-bold mt-2 ${color}`}>${Math.abs(value).toFixed(2)}</h3>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Income vs Expenses</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-[300px] w-full" /> : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={evolution} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={v => `$${v}`} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }} formatter={(v: number) => [`$${v.toFixed(2)}`, undefined]} />
                  <Legend />
                  <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Cash Flow</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[250px] w-full" /> : (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={evolution} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7B2FF7" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#7B2FF7" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={v => `$${v}`} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }} formatter={(v: number) => [`$${v.toFixed(2)}`, undefined]} />
                    <Area type="monotone" dataKey="balance" name="Balance" stroke="#7B2FF7" strokeWidth={2} fill="url(#balanceGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Expenses by Category</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[250px] w-full" /> : expensesByCategory.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">No expense data available.</div>
            ) : (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={expensesByCategory} dataKey="amount" cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} stroke="none">
                      {expensesByCategory.map((entry, i) => (
                        <Cell key={i} fill={entry.color || `hsl(var(--chart-${(i % 5) + 1}))`} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, undefined]} contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2 max-h-[60px] overflow-y-auto">
                  {expensesByCategory.slice(0, 4).map((e, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: e.color || "hsl(var(--primary))" }} />
                        <span>{e.name}</span>
                      </div>
                      <span className="font-medium">${e.amount.toFixed(2)}</span>
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