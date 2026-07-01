import { useGetMonthlyEvolution, useGetExpensesByCategory } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from "recharts";

export default function Reports() {
  const { data: evolution, isLoading: isLoadingEvolution } = useGetMonthlyEvolution();
  const { data: expenses, isLoading: isLoadingExpenses } = useGetExpensesByCategory();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Reports</h2>
        <p className="text-muted-foreground">Analyze your financial health with detailed insights.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Income vs Expenses (6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingEvolution ? (
              <Skeleton className="w-full h-[350px]" />
            ) : evolution?.length === 0 ? (
               <div className="h-[350px] flex items-center justify-center text-muted-foreground border border-dashed rounded-xl bg-muted/20">
                 No data available for evolution
               </div>
            ) : (
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={evolution} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorInc2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExp2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(val) => `$${val}`} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} formatter={(val: number) => [`$${val.toFixed(2)}`, undefined]} />
                    <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorInc2)" name="Income" />
                    <Area type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorExp2)" name="Expenses" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingExpenses ? (
              <Skeleton className="w-full h-[300px]" />
            ) : expenses?.length === 0 ? (
               <div className="h-[300px] flex items-center justify-center text-muted-foreground border border-dashed rounded-xl bg-muted/20">
                 No spending data available
               </div>
            ) : (
              <div className="h-[300px] w-full flex flex-col md:flex-row items-center gap-8">
                <div className="h-[250px] w-full md:w-1/2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={expenses} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="amount" stroke="none">
                        {expenses?.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.categoryColor || `hsl(var(--chart-${(index % 5) + 1}))`} />)}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, undefined]} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full md:w-1/2 space-y-3 overflow-y-auto max-h-[250px] pr-4">
                   {expenses?.map(exp => (
                    <div key={exp.categoryId} className="flex items-center justify-between text-sm p-2 hover:bg-muted/50 rounded-lg transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: exp.categoryColor || 'hsl(var(--primary))' }} />
                        <span className="font-medium">{exp.categoryName}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold">${exp.amount.toFixed(2)}</span>
                        <span className="text-muted-foreground ml-2 text-xs">({exp.percentage.toFixed(1)}%)</span>
                      </div>
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
