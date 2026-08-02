import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { getAccounts } from "@/services/accounts";
import { getTransactions } from "@/services/transactions";
import { getBills } from "@/services/bills";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowDownRight, ArrowUpRight, PiggyBank, Scale, Wallet, Repeat, AreaChart as AreaChartIcon, LineChart as LineChartIcon, BarChart3 } from "lucide-react";
import { format, subMonths, addDays, addMonths, addYears, isBefore, isAfter } from "date-fns";
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
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import { computeAccountBalance } from "@/lib/account-balance";
import { AccountTabs } from "@/components/account-tabs";
import { useUserPreferences } from "@/contexts/user-preferences";
import { formatCurrency, getCurrencySymbol } from "@/lib/currency";

type ChartType = "area" | "line" | "bar";

const CHART_TYPE_OPTIONS: { value: ChartType; label: string; icon: typeof AreaChartIcon }[] = [
  { value: "area", label: "Área", icon: AreaChartIcon },
  { value: "line", label: "Linha", icon: LineChartIcon },
  { value: "bar", label: "Barras", icon: BarChart3 },
];

const EMERGENCY_FUND_COLOR = "#9B5FFA";

const RECURRENCE_LABELS: Record<string, string> = {
  weekly: "Semanal",
  monthly: "Mensal",
  yearly: "Anual",
};

const UPCOMING_OCCURRENCES_COUNT = 3;

export default function Dashboard() {
  const [, navigate] = useLocation();
  const [chartType, setChartType] = useState<ChartType>("area");
  const [selectedAccountTab, setSelectedAccountTab] = useState<string>("");
  const { data: accounts, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ["accounts"],
    queryFn: getAccounts,
  });

  useEffect(() => {
    if (!selectedAccountTab && accounts?.length) {
      setSelectedAccountTab(accounts[0].id);
    }
  }, [accounts, selectedAccountTab]);

  const { data: transactions, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => getTransactions(),
  });

  const { data: bills, isLoading: isLoadingBills } = useQuery({
    queryKey: ["bills"],
    queryFn: getBills,
  });

  const { currency } = useUserPreferences();

  const isLoadingSummary = isLoadingAccounts || isLoadingTransactions;

  const selectedAccount = accounts?.find((a) => a.id === selectedAccountTab);
  const isInvestorAccount = selectedAccount?.type === "investment";

  // --- Transações filtradas pela conta selecionada ---
  const scopedTransactions = useMemo(() => {
    if (!transactions || !selectedAccountTab) return [];
    return transactions.filter((t) => t.account_id === selectedAccountTab);
  }, [transactions, selectedAccountTab]);

  // --- Resumo (cards do topo) ---
  const summary = useMemo(() => {
    if (!accounts || !transactions) return null;

    const totalBalance = selectedAccount ? computeAccountBalance(selectedAccount, transactions) : 0;

    const now = new Date();
    const currentMonthKey = format(now, "yyyy-MM");
    const lastMonthKey = format(subMonths(now, 1), "yyyy-MM");

    const sumByMonth = (monthKey: string, type: "income" | "expense") =>
      scopedTransactions
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

    const investorWithdrawal = scopedTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const investorDividends = scopedTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      totalBalance,
      monthlyIncome,
      monthlyIncomeChange: pctChange(monthlyIncome, lastMonthIncome),
      monthlyExpenses,
      monthlyExpensesChange: pctChange(monthlyExpenses, lastMonthExpenses),
      monthlyNet,
      monthlyNetChange: pctChange(monthlyNet, lastMonthNet),
      investorWithdrawal,
      investorDividends,
    };
  }, [accounts, transactions, scopedTransactions, selectedAccountTab, selectedAccount]);

  // --- Evolução mensal (últimos 6 meses) ---
  const evolution = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => subMonths(new Date(), 5 - i));

    return months.map((monthDate) => {
      const monthKey = format(monthDate, "yyyy-MM");
      const income = scopedTransactions
        .filter((t) => t.date.startsWith(monthKey) && t.type === "income")
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const expenses = scopedTransactions
        .filter((t) => t.date.startsWith(monthKey) && t.type === "expense")
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const emergencyFund = scopedTransactions
        .filter((t) => t.date.startsWith(monthKey) && (t.type === "savings" || (t as any).categories?.type === "savings"))
        .reduce((sum, t) => sum + Number(t.amount), 0);

      return { label: format(monthDate, "MMM"), income, expenses, emergencyFund };
    });
  }, [scopedTransactions]);

  const hasEmergencyFundData = evolution.some((m) => m.emergencyFund > 0);

  // --- Despesas por categoria (mês atual) ---
  const expensesByCategory = useMemo(() => {
    const currentMonthKey = format(new Date(), "yyyy-MM");
    const grouped = new Map<string, { categoryId: string; categoryName: string; categoryColor: string | null; amount: number }>();

    scopedTransactions
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
  }, [scopedTransactions]);

  const recentTransactions = scopedTransactions.slice(0, 5);

  // --- Despesas recorrentes: próximas ocorrências projetadas ---
  const upcomingBills = useMemo(() => {
    if (!bills) return [];

    const today = new Date();

    const advance = (date: Date, recurrence: string): Date => {
      if (recurrence === "weekly") return addDays(date, 7);
      if (recurrence === "yearly") return addYears(date, 1);
      return addMonths(date, 1); // monthly (default)
    };

    return bills
      .filter((b) => b.recurrence && b.recurrence !== "once")
      .map((bill) => {
        const start = bill.start_date ? new Date(bill.start_date) : new Date(bill.due_date);
        const end = bill.end_date ? new Date(bill.end_date) : null;

        // Avança a partir de `start` até encontrar a primeira ocorrência >= hoje
        let cursor = start;
        while (isBefore(cursor, today)) {
          cursor = advance(cursor, bill.recurrence);
        }

        const occurrences: Date[] = [];
        while (occurrences.length < UPCOMING_OCCURRENCES_COUNT && (!end || !isAfter(cursor, end))) {
          occurrences.push(cursor);
          cursor = advance(cursor, bill.recurrence);
        }

        const ended = !!end && occurrences.length === 0;

        return { bill, occurrences, ended };
      });
  }, [bills]);

  return (
    <div className="space-y-5 pb-12">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Visão geral das tuas finanças.</p>
      </div>

      <AccountTabs accounts={accounts ?? []} value={selectedAccountTab} onChange={setSelectedAccountTab} />

      {isInvestorAccount ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SummaryCard
            title="Saldo Total"
            value={summary?.totalBalance}
            icon={Wallet}
            isLoading={isLoadingSummary}
          />
          <SummaryCard
            title="Saque"
            value={summary?.investorWithdrawal}
            icon={ArrowDownRight}
            isLoading={isLoadingSummary}
            trend="down"
          />
          <SummaryCard
            title="Valor Dividendos"
            value={summary?.investorDividends}
            icon={ArrowUpRight}
            isLoading={isLoadingSummary}
            trend="up"
          />
        </div>
      ) : (
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
      )}

      <div className={cn("grid grid-cols-1 gap-4", !isInvestorAccount && "lg:grid-cols-3")}>
        <Card className={cn(!isInvestorAccount && "lg:col-span-2")}>
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
            <CardTitle>{isInvestorAccount ? "Evolução de Dividendos e Saques" : "Evolução do Fluxo de Caixa"}</CardTitle>
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
                      <linearGradient id="colorEmergencyFund" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={EMERGENCY_FUND_COLOR} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={EMERGENCY_FUND_COLOR} stopOpacity={0} />
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
                      tickFormatter={(value) => `${getCurrencySymbol(currency)}${value}`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                      formatter={(value: number) => [formatCurrency(value, currency), undefined]}
                    />
                    {chartType === "area" && [
                      <Area key="income" type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" name={isInvestorAccount ? "Dividendos" : "Receitas"} />,
                      <Area key="expenses" type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" name={isInvestorAccount ? "Saques" : "Despesas"} />,
                      ...(hasEmergencyFundData ? [<Area key="emergencyFund" type="monotone" dataKey="emergencyFund" stroke={EMERGENCY_FUND_COLOR} strokeWidth={2} fillOpacity={1} fill="url(#colorEmergencyFund)" name="Fundo de Emergência" />] : []),
                    ]}
                    {chartType === "line" && [
                      <Line key="income" type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} dot={false} name={isInvestorAccount ? "Dividendos" : "Receitas"} />,
                      <Line key="expenses" type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={2} dot={false} name={isInvestorAccount ? "Saques" : "Despesas"} />,
                      ...(hasEmergencyFundData ? [<Line key="emergencyFund" type="monotone" dataKey="emergencyFund" stroke={EMERGENCY_FUND_COLOR} strokeWidth={2} dot={false} name="Fundo de Emergência" />] : []),
                    ]}
                    {chartType === "bar" && [
                      <Bar key="income" dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name={isInvestorAccount ? "Dividendos" : "Receitas"} />,
                      <Bar key="expenses" dataKey="expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} name={isInvestorAccount ? "Saques" : "Despesas"} />,
                      ...(hasEmergencyFundData ? [<Bar key="emergencyFund" dataKey="emergencyFund" fill={EMERGENCY_FUND_COLOR} radius={[4, 4, 0, 0]} name="Fundo de Emergência" />] : []),
                    ]}
                    {(hasEmergencyFundData || isInvestorAccount) && <Legend wrapperStyle={{ fontSize: 12 }} />}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {!isInvestorAccount && (
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
                          formatter={(value: number) => [formatCurrency(value, currency), undefined]}
                          contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full mt-4 space-y-2 max-h-[80px] overflow-y-auto pr-2">
                    {expensesByCategory.slice(0, 4).map((exp) => (
                      <div key={exp.categoryId} className="flex items-center justify-between text-sm min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: exp.categoryColor || "hsl(var(--primary))" }} />
                          <span className="flex-1 min-w-0 truncate">{exp.categoryName}</span>
                        </div>
                        <span className="font-medium shrink-0">{formatCurrency(exp.amount, currency)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
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
                <div
                  key={tx.id}
                  className="flex items-center justify-between gap-3 group hover:bg-muted/50 p-2 -mx-2 rounded-lg transition-colors cursor-pointer"
                  onClick={() => navigate(`/transactions?edit=${tx.id}`)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${tx.type === "income" ? "bg-emerald-500/10 text-emerald-500" : tx.type === "savings" ? "bg-[#9B5FFA]/10 text-[#9B5FFA]" : "bg-rose-500/10 text-rose-500"}`}>
                      {tx.type === "income" ? <ArrowUpRight className="w-5 h-5" /> : tx.type === "savings" ? <PiggyBank className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm leading-none truncate">{tx.description || (tx as any).categories?.name || (tx.type === "savings" ? "Fundo de Emergência" : "Transação")}</p>
                      <p className="text-xs text-muted-foreground mt-1.5">{format(new Date(tx.date), "dd MMM yyyy")}</p>
                    </div>
                  </div>
                  <div className={`font-semibold text-sm shrink-0 ${tx.type === "income" ? "text-emerald-500" : tx.type === "savings" ? "text-[#9B5FFA]" : "text-rose-500"}`}>
                    {tx.type === "income" ? "+" : tx.type === "savings" ? "" : "-"}{formatCurrency(Math.abs(Number(tx.amount)), currency)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {!isInvestorAccount && (
        <Card>
          <CardHeader>
            <CardTitle>Despesas Recorrentes — Próximos Meses</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingBills ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : upcomingBills.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">Sem despesas recorrentes configuradas.</div>
            ) : (
              <div className="space-y-4">
                {upcomingBills.map(({ bill, occurrences, ended }) => (
                  <div key={bill.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-primary/10 text-primary">
                        <Repeat className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm leading-none truncate">{bill.name}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-xs text-muted-foreground">{RECURRENCE_LABELS[bill.recurrence] ?? bill.recurrence}</span>
                          <span className="text-xs text-muted-foreground">{formatCurrency(Number(bill.amount), currency)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {ended ? (
                        <p className="text-sm text-muted-foreground">Terminada</p>
                      ) : (
                        <>
                          <p className="text-sm font-semibold text-foreground">{format(occurrences[0], "dd MMM")}</p>
                          {occurrences.length > 1 && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              depois: {occurrences.slice(1).map((d) => format(d, "dd MMM")).join(" · ")}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SummaryCard({ title, value, change, icon: Icon, isLoading, isCurrency = true, trend }: any) {
  const { currency } = useUserPreferences();
  const currencySymbol = getCurrencySymbol(currency);
  const iconColorClass = trend === "down" ? "bg-rose-500/10 text-rose-500" : trend === "up" ? "bg-emerald-500/10 text-emerald-500" : "bg-primary/10 text-primary";
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className={`w-7 h-7 rounded-md flex items-center justify-center ${iconColorClass}`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-3">
          {isLoading ? (
            <Skeleton className="h-7 w-24" />
          ) : (
            <h3 className="text-xl font-bold tracking-tight">
              {isCurrency && (value ?? 0) < 0 ? `-${currencySymbol}` : isCurrency ? currencySymbol : ""}
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