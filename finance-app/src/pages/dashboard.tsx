import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { getAccounts } from "@/services/accounts";
import { getTransactions } from "@/services/transactions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowDownRight, ArrowUpRight, Scale, Wallet, AreaChart as AreaChartIcon, LineChart as LineChartIcon, BarChart3 } from "lucide-react";
import { format, subMonths } from "date-fns";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { cn } from "@/lib/utils";

type ChartType = "area" | "line" | "bar";

const CHART_TYPE_OPTIONS: { value: ChartType; label: string; icon: typeof AreaChartIcon }[] = [
  { value: "area", label: "Área", icon: AreaChartIcon },
  { value: "line", label: "Linha", icon: LineChartIcon },
  { value: "bar", label: "Barras", icon: BarChart3 },
];

const EMERGENCY_FUND_COLOR = "#9B5FFA";

export default function Dashboard() {
  const [chartType, setChartType] = useState<ChartType>("area");
  const { data: accounts, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ["accounts"],
    queryFn: getAccounts,
  });

  const { data: transactions, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => getTransactions(),
  });

  const isLoadingSummary = isLoadingAccounts || isLoadingTransactions;

  // --- Resumo (cards do topo) ---
  const summary = useMemo(() => {
    if (!accounts || !transactions) return null;

    const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance), 0);

    const now = new Date();
    const currentMonthKey = format(now, "yyyy-MM");
    const lastMonthKey = format(subMonths(now, 1), "yyyy-MM");

    const sumByMonth = (monthKey: string, type: "income" | "expense") =>
      transactions
        .filter((t) => t.date.startsWith(monthKey) && t.type === type)
        .reduce((sum, t) => sum + Number(t.amount), 0);

    const monthlyIncome = sumByMonth(currentMonthKey, "income");
    const monthlyExpenses = sumByMonth(currentMonthKey, "expense");
    const lastMonthIncome = sumByMonth(lastMonthKey, "income");
    const lastMonthExpenses = sumByMonth(lastMonthKey, "expense");

    const pctChange = (current: number, previous: number) =>
      previous === 0 ? 0 : Math.round(((current - previous) / previous) * 100);

    const monthlyNet = monthlyIncome - monthlyExpenses;
    const lastMonthNet = lastMonthIncome - lastMonthExpenses;

    return {
      totalBalance,
      monthlyIncome,
      monthlyIncomeChange: pctChange(monthlyIncome, lastMonthIncome),
      monthlyExpenses,
      monthlyExpensesChange: pctChange(monthlyExpenses, lastMonthExpenses),
      monthlyNet,
      monthlyNetChange: pctChange(monthlyNet, lastMonthNet),
    };
  }, [accounts, transactions]);

  // --- Evolução mensal (últimos 6 meses) ---
  const evolution = useMemo(() => {
    if (!transactions) return [];

    const months = Array.from({ length: 6 }, (_, i) => subMonths(new Date(), 5 - i));

    return months.map((monthDate) => {
      const monthKey = format(monthDate, "yyyy-MM");
      const income = transactions
        .filter((t) => t.date.startsWith(monthKey) && t.type === "income")
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const expenses = transactions
        .filter((t) => t.date.startsWith(monthKey) && t.type === "expense")
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const emergencyFund = transactions
        .filter((t) => t.date.startsWith(monthKey) && (t as any).categories?.type === "savings")
        .reduce((sum, t) => sum + Number(t.amount), 0);

      return { label: format(monthDate, "MMM"), income, expenses, emergencyFund };
    });
  }, [transactions]);

  const hasEmergencyFundData = evolution.some((m) => m.emergencyFund > 0);

  // --- Despesas por categoria (mês atual) ---
  const expensesByCategory = useMemo(() => {
    if (!transactions) return [];

    const currentMonthKey = format(new Date(), "yyyy-MM");
    const grouped = new Map<string, { categoryId: string; categoryName: string; categoryColor: string | null; amount: number }>();

    transactions
      .filter((t) => t.date.startsWith(currentMonthKey) && t.type === "expense")
      .forEach((t) => {
        const cat = (t as any).categories;
        const key = t.category_id || "uncategorized";
        const existing = grouped.get(key);
        const amount = Number(t.amount);

        if (existing) {
          existing.amount += amount;
        } else {
          grouped.set(key, {
            categoryId: key,
            categoryName: cat?.name || "Sem categoria",
            categoryColor: cat?.color || null,
            amount,
          });
        }
      });

    return Array.from(grouped.values()).sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  const recentTransactions = transactions?.slice(0, 5) ?? [];

  return (
    <div className="space-y-5 pb-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Saldo Total"
          value={summary?.totalBalance}
          icon={Wallet}
          isLoading={isLoadingSummary}
        />
        <SummaryCard
          title="Receita Mensal"
          value={summary?.monthlyIncome}
          change={summary?.monthlyIncomeChange}
          icon={ArrowUpRight}
          isLoading={isLoadingSummary}
          trend="up"
        />
        <SummaryCard
          title="Despesa Mensal"
          value={summary?.monthlyExpenses}
          change={summary?.monthlyExpensesChange}
          icon={ArrowDownRight}
          isLoading={isLoadingSummary}
          trend="down"
        />
        <SummaryCard
          title="Saldo do Mês"
          value={summary?.monthlyNet}
          change={summary?.monthlyNetChange}
          icon={Scale}
          isLoading={isLoadingSummary}
          trend="up"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
            <CardTitle>Evolução do Fluxo de Caixa</CardTitle>
            <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5">
              {CHART_TYPE_OPTIONS.map(({ value, label, icon: Icon }) => (
                <Button
                  key={value}
                  type="button"
                  variant="ghost"
                  size="icon"
                  title={label}
                  onClick={() => setChartType(value)}
                  className={cn(
                    "h-7 w-7 text-muted-foreground hover:text-foreground",
                    chartType === value && "bg-background text-foreground shadow-sm"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingTransactions ? (
              <div className="h-[260px] flex items-center justify-center">
                <Skeleton className="w-full h-full" />
              </div>
            ) : evolution.length === 0 ? (
              <div className="h-[260px] flex items-center justify-center text-muted-foreground border border-dashed rounded-xl bg-muted/20">
                Sem dados disponíveis
              </div>
            ) : (
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={evolution} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      tickFormatter={(value) => `€${value}`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                      formatter={(value: number) => [`€${value.toFixed(2)}`, undefined]}
                    />
                    {chartType === "area" && [
                      <Area key="income" type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" name="Receitas" />,
                      <Area key="expenses" type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" name="Despesas" />,
                    ]}
                    {chartType === "line" && [
                      <Line key="income" type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} dot={false} name="Receitas" />,
                      <Line key="expenses" type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={2} dot={false} name="Despesas" />,
                    ]}
                    {chartType === "bar" && [
                      <Bar key="income" dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="Receitas" />,
                      <Bar key="expenses" dataKey="expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Despesas" />,
                    ]}
                    {hasEmergencyFundData && (
                      <Line
                        key="emergencyFund"
                        type="monotone"
                        dataKey="emergencyFund"
                        stroke={EMERGENCY_FUND_COLOR}
                        strokeWidth={2}
                        dot={false}
                        name="Fundo de Emergência"
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingTransactions ? (
              <div className="h-[260px] flex items-center justify-center">
                <Skeleton className="w-[200px] h-[200px] rounded-full" />
              </div>
            ) : expensesByCategory.length === 0 ? (
              <div className="h-[260px] flex items-center justify-center text-muted-foreground border border-dashed rounded-xl bg-muted/20">
                Sem dados disponíveis
              </div>
            ) : (
              <div className="w-full flex flex-col items-center pb-1">
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expensesByCategory}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="amount"
                        stroke="none"
                      >
                        {expensesByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.categoryColor || `hsl(var(--chart-${(index % 5) + 1}))`} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [`€${value.toFixed(2)}`, undefined]}
                        contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full mt-4 space-y-2 max-h-[80px] overflow-y-auto pr-2">
                  {expensesByCategory.slice(0, 4).map((exp) => (
                    <div key={exp.categoryId} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: exp.categoryColor || "hsl(var(--primary))" }} />
                        <span className="truncate max-w-[100px]">{exp.categoryName}</span>
                      </div>
                      <span className="font-medium">€{exp.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingTransactions ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentTransactions.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">Sem transações recentes</div>
          ) : (
            <div className="space-y-4">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between gap-3 group hover:bg-muted/50 p-2 -mx-2 rounded-lg transition-colors cursor-pointer">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${tx.type === "income" ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
                      {tx.type === "income" ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm leading-none truncate">{tx.description || (tx as any).categories?.name || "Transação"}</p>
                      <p className="text-xs text-muted-foreground mt-1.5">{format(new Date(tx.date), "dd MMM yyyy")}</p>
                    </div>
                  </div>
                  <div className={`font-semibold text-sm shrink-0 ${tx.type === "income" ? "text-emerald-500" : ""}`}>
                    {tx.type === "income" ? "+" : "-"}€{Math.abs(Number(tx.amount)).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ title, value, change, icon: Icon, isLoading, isCurrency = true, trend }: any) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
            <Icon className="w-3.5 h-3.5 text-primary" />
          </div>
        </div>
        <div className="mt-3">
          {isLoading ? (
            <Skeleton className="h-7 w-24" />
          ) : (
            <h3 className="text-xl font-bold tracking-tight">
              {isCurrency && (value ?? 0) < 0 ? "-€" : isCurrency ? "€" : ""}
              {Math.abs(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: isCurrency ? 2 : 0, maximumFractionDigits: isCurrency ? 2 : 0 })}
            </h3>
          )}
        </div>
        {change !== undefined && (
          <p className={`text-xs mt-1.5 font-medium ${change > 0 ? (trend === "down" ? "text-rose-500" : "text-emerald-500") : change < 0 ? (trend === "down" ? "text-emerald-500" : "text-rose-500") : "text-muted-foreground"}`}>
            {change > 0 ? "+" : ""}
            {change}% em relação ao mês anterior
          </p>
        )}
      </CardContent>
    </Card>
  );
}