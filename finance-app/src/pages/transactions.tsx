import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getTransactions, getTransactionById, createTransaction, updateTransaction, deleteTransaction } from "@/services/transactions";
import { EmptyStateIllustration } from "@/components/empty-state-illustration";
import { getAccounts } from "@/services/accounts";
import { getCategories } from "@/services/categories";
import { getCreditCards } from "@/services/creditCards";
import { format, addMonths } from "date-fns";
import { pt } from "date-fns/locale";
import { Plus, ArrowDownRight, ArrowUpRight, PiggyBank, Search, Filter, Loader2, Pencil, Trash2, Download, X, ChevronLeft, ChevronRight } from "lucide-react";
import { downloadStyledExcel } from "@/lib/excel-export";
import { formatCurrency } from "@/lib/currency";
import { cn, capitalizeFirst } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useUserPreferences } from "@/contexts/user-preferences";

type TransactionType = "income" | "expense" | "savings";

const MONTH_CHIPS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function shiftMonth(monthStr: string, delta: number): string {
  const [y, m] = monthStr.split("-").map(Number);
  return format(addMonths(new Date(y, m - 1, 1), delta), "yyyy-MM");
}

function MonthNavigator({ month, onChange }: { month: string; onChange: (month: string) => void }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const selectedYear = Number(month.slice(0, 4));
  const selectedMonthIdx = Number(month.slice(5, 7)) - 1;
  const [pickerYear, setPickerYear] = useState(selectedYear);

  const label = format(new Date(selectedYear, selectedMonthIdx, 1), "MMMM yyyy", { locale: pt });
  const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-1">
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => onChange(shiftMonth(month, -1))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <button
          type="button"
          onClick={() => { setPickerYear(selectedYear); setPickerOpen((o) => !o); }}
          className={cn(
            "px-4 py-1.5 rounded-full border-2 font-semibold text-sm transition-colors",
            pickerOpen ? "border-primary bg-primary/10 text-primary" : "border-primary text-primary hover:bg-primary/10"
          )}
        >
          {capitalizedLabel}
        </button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => onChange(shiftMonth(month, 1))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {pickerOpen && (
        <div className="flex flex-col items-center gap-2.5 p-3 rounded-xl border bg-card shadow-sm">
          <div className="flex items-center gap-3">
            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPickerYear((y) => y - 1)}>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <span className="font-semibold text-sm w-12 text-center">{pickerYear}</span>
            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPickerYear((y) => y + 1)}>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {MONTH_CHIPS.map((name, idx) => {
              const isSelected = pickerYear === selectedYear && idx === selectedMonthIdx;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    onChange(`${pickerYear}-${String(idx + 1).padStart(2, "0")}`);
                    setPickerOpen(false);
                  }}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/70 text-secondary-foreground"
                  )}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const EMPTY_FORM = {
  type: "expense" as TransactionType,
  description: "",
  amount: "",
  date: format(new Date(), "yyyy-MM-dd"),
  category_id: "",
  account_id: "",
  card_id: "",
};

export default function Transactions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isModuleEnabled, currency } = useUserPreferences();
  const urlSearch = useSearch();
  const [, navigate] = useLocation();
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [searchText, setSearchText] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterAccountId, setFilterAccountId] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterCategoryId, setFilterCategoryId] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const hasActiveFilters =
    searchText.trim() !== "" ||
    filterAccountId !== "all" ||
    filterType !== "all" ||
    filterCategoryId !== "all" ||
    filterStatus !== "all";

  function clearFilters() {
    setSearchText("");
    setFilterAccountId("all");
    setFilterType("all");
    setFilterCategoryId("all");
    setFilterStatus("all");
  }

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["transactions", month, filterAccountId, filterType, filterCategoryId, filterStatus],
    queryFn: () => getTransactions({
      month,
      accountId: filterAccountId !== "all" ? filterAccountId : undefined,
      type: filterType !== "all" ? (filterType as TransactionType) : undefined,
      categoryId: filterCategoryId !== "all" ? filterCategoryId : undefined,
      status: filterStatus !== "all" ? (filterStatus as "paid" | "pending") : undefined,
    }),
  });
  const { data: accounts } = useQuery({ queryKey: ["accounts"], queryFn: getAccounts });
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: getCategories });
  const { data: cards } = useQuery({ queryKey: ["credit-cards"], queryFn: getCreditCards });
  const filteredCategories = categories?.filter(c => c.type === form.type || c.type === "both") ?? [];
  const filterCategoryOptions = categories?.filter(c => filterType === "all" || c.type === filterType || c.type === "both") ?? [];

  const displayedTransactions = transactions?.filter((tx) => {
    if (!searchText.trim()) return true;
    const q = searchText.trim().toLowerCase();
    const description = (tx.description ?? "").toLowerCase();
    const categoryName = ((tx as any).categories?.name ?? "").toLowerCase();
    return description.includes(q) || categoryName.includes(q);
  });

  const TYPE_LABELS: Record<string, string> = { income: "Receita", expense: "Despesa", savings: "Poupança" };
  const STATUS_LABELS: Record<string, string> = { paid: "Paga", pending: "Pendente" };

  async function handleExportExcel() {
    const rows = (displayedTransactions ?? []).map((tx) => ({
      date: tx.date,
      type: TYPE_LABELS[tx.type] ?? tx.type,
      description: tx.description ?? "",
      category: (tx as any).categories?.name ?? "",
      card: (tx as any).credit_cards?.name ?? "",
      status: STATUS_LABELS[tx.status] ?? tx.status,
      amount: Number(tx.amount),
    }));
    await downloadStyledExcel(
      `transacoes-${month}.xlsx`,
      "Transações",
      [
        { header: "Data", key: "date", width: 14 },
        { header: "Tipo", key: "type", width: 14 },
        { header: "Descrição", key: "description", width: 32 },
        { header: "Categoria", key: "category", width: 20 },
        { header: "Cartão", key: "card", width: 18 },
        { header: "Estado", key: "status", width: 12 },
        { header: "Valor (€)", key: "amount", width: 14, numFmt: "#,##0.00" },
      ],
      rows
    );
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(tx: { id: string; type: string; description: string | null; amount: number; date: string; category_id: string | null; account_id: string; card_id: string | null }) {
    setEditingId(tx.id);
    setForm({
      type: tx.type as TransactionType,
      description: tx.description ?? "",
      amount: String(tx.amount ?? ""),
      date: tx.date,
      category_id: tx.category_id ?? "",
      account_id: tx.account_id ?? "",
      card_id: tx.card_id ?? "",
    });
    setModalOpen(true);
  }

  const editParamId = new URLSearchParams(urlSearch).get("edit");
  useEffect(() => {
    if (!editParamId) return;
    getTransactionById(editParamId).then((tx) => {
      if (!tx) return;
      setMonth(tx.date.slice(0, 7));
      openEdit(tx);
    });
    navigate("/transactions", { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editParamId]);

  const isNewParam = new URLSearchParams(urlSearch).get("new") === "1";
  useEffect(() => {
    if (!isNewParam) return;
    openCreate();
    navigate("/transactions", { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNewParam]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!form.account_id) throw new Error("Escolhe uma conta");
      const payload = {
        account_id: form.account_id,
        category_id: form.category_id || null,
        card_id: form.card_id || null,
        amount: Number(form.amount) || 0,
        type: form.type,
        description: capitalizeFirst(form.description),
        date: form.date,
      };
      if (editingId) {
        return updateTransaction(editingId, payload);
      }
      return createTransaction({ ...payload, status: "paid", recurrence: "once", tags: [] });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setModalOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
    },
    onError: (err) => {
      toast({ title: "Não foi possível guardar a transação", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setDeleteId(null);
    },
    onError: (err) => {
      toast({ title: "Não foi possível eliminar a transação", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Transações</h2>
          <p className="text-muted-foreground">Gere as tuas receitas e despesas.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {isModuleEnabled("export") && (
            <Button variant="outline" className="flex-1 sm:flex-none" onClick={handleExportExcel} disabled={!transactions?.length}>
              <Download className="w-4 h-4 mr-2" />
              Exportar Excel
            </Button>
          )}
        <Dialog open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) setEditingId(null); }}>
          <DialogTrigger asChild>
            <Button className="flex-1 sm:flex-none" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Transação
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar transação" : "Nova transação"}</DialogTitle>
              <DialogDescription>{editingId ? "Atualiza os dados desta transação." : "Regista uma receita ou despesa."}</DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate();
              }}
            >
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={form.type === "expense" ? "default" : "outline"}
                  onClick={() => setForm(f => ({ ...f, type: "expense", category_id: "" }))}
                  className={form.type === "expense" ? "bg-rose-500 hover:bg-rose-500/90 text-white" : ""}
                >
                  Despesa
                </Button>
                <Button
                  type="button"
                  variant={form.type === "income" ? "default" : "outline"}
                  onClick={() => setForm(f => ({ ...f, type: "income", category_id: "" }))}
                >
                  Receita
                </Button>
                <Button
                  type="button"
                  variant={form.type === "savings" ? "default" : "outline"}
                  onClick={() => setForm(f => ({ ...f, type: "savings", category_id: "" }))}
                  className={form.type === "savings" ? "bg-[#9B5FFA] hover:bg-[#9B5FFA]/90 text-white" : ""}
                >
                  Fundo
                </Button>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tx-description">Descrição</Label>
                <Input id="tx-description" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Ex: Supermercado" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="tx-amount">Valor</Label>
                  <Input id="tx-amount" type="number" step="0.01" required value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tx-date">Data</Label>
                  <Input id="tx-date" type="date" required value={form.date} onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
              </div>
              {form.type !== "savings" && (
                <div className="space-y-1.5">
                  <Label>Categoria</Label>
                  <Select value={form.category_id} onValueChange={(v) => setForm(f => ({ ...f, category_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                    <SelectContent>
                      {filteredCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Conta</Label>
                <Select value={form.account_id} onValueChange={(v) => setForm(f => ({ ...f, account_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Escolhe uma conta" /></SelectTrigger>
                  <SelectContent>
                    {accounts?.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {!!cards?.length && (
                <div className="space-y-1.5">
                  <Label>Cartão de crédito</Label>
                  <Select value={form.card_id} onValueChange={(v) => setForm(f => ({ ...f, card_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                    <SelectContent>
                      {cards.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <DialogFooter>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingId ? "Guardar Alterações" : "Criar transação"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <Select value={filterType} onValueChange={(v) => { setFilterType(v); setFilterCategoryId("all"); }}>
          <SelectTrigger className="w-auto gap-1.5 rounded-full bg-primary text-primary-foreground border-none px-4 h-9 font-semibold hover:bg-primary/90 [&>svg]:text-primary-foreground [&>svg]:opacity-100">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="income">Receitas</SelectItem>
            <SelectItem value="expense">Despesas</SelectItem>
            <SelectItem value="savings">Fundo</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <div className={cn("flex items-center overflow-hidden transition-all duration-300 ease-out", searchOpen ? "w-48 sm:w-64" : "w-9")}>
            {searchOpen ? (
              <div className="relative w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  autoFocus
                  placeholder="Pesquisar transações..."
                  className="pl-9 bg-muted/50 border-none w-full"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onBlur={() => { if (!searchText.trim()) setSearchOpen(false); }}
                />
              </div>
            ) : (
              <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={() => setSearchOpen(true)}>
                <Search className="w-4 h-4" />
              </Button>
            )}
          </div>
          <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className={`shrink-0 ${filterAccountId !== "all" || filterCategoryId !== "all" || filterStatus !== "all" ? "border-primary text-primary" : ""}`}
              >
                <Filter className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Filtrar transações</DialogTitle>
                <DialogDescription>Escolhe os filtros que queres aplicar à lista.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Conta</Label>
                  <Select value={filterAccountId} onValueChange={setFilterAccountId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as contas</SelectItem>
                      {accounts?.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Categoria</Label>
                  <Select value={filterCategoryId} onValueChange={setFilterCategoryId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as categorias</SelectItem>
                      {filterCategoryOptions.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Estado</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os estados</SelectItem>
                      <SelectItem value="paid">Paga</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={clearFilters}>Limpar filtros</Button>
                <Button type="button" onClick={() => setFilterOpen(false)}>Aplicar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground hover:text-foreground"
              onClick={clearFilters}
              title="Limpar filtros"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <MonthNavigator month={month} onChange={setMonth} />

      <Card>
        <CardContent className="p-0">
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
            ) : displayedTransactions?.length === 0 ? (
              <div className="flex flex-col items-center p-10 text-center text-muted-foreground">
                <EmptyStateIllustration />
                Nenhuma transação encontrada para este período.
              </div>
            ) : (
              displayedTransactions?.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between gap-3 p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => openEdit(tx)}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${tx.type === "income" ? "bg-emerald-500/10 text-emerald-500" : tx.type === "savings" ? "bg-[#9B5FFA]/10 text-[#9B5FFA]" : "bg-rose-500/10 text-rose-500"}`}>
                      {tx.type === "income" ? <ArrowUpRight className="w-5 h-5" /> : tx.type === "savings" ? <PiggyBank className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{tx.description || (tx as any).categories?.name || (tx.type === "savings" ? "Fundo de Emergência" : "Transação")}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">{format(new Date(tx.date), "dd MMM yyyy")}</span>
                        {(tx as any).categories?.name && (
                          <Badge
                            variant="outline"
                            className="text-[10px] h-4 px-1.5"
                            style={{
                              borderColor: (tx as any).categories.color ? `${(tx as any).categories.color}55` : undefined,
                              color: (tx as any).categories.color || undefined,
                            }}
                          >
                            {(tx as any).categories.name}
                          </Badge>
                        )}
                        {(tx as any).credit_cards?.name && (
                          <>
                            <span className="text-xs text-muted-foreground">&bull;</span>
                            <span className="text-xs text-muted-foreground">{(tx as any).credit_cards.name}</span>
                          </>
                        )}
                        {tx.status === "pending" && (
                          <Badge variant="outline" className="text-[10px] h-4 px-1 ml-1 bg-amber-500/10 text-amber-500 border-amber-500/20">Pendente</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <div className="text-right mr-1">
                      <div className={`font-semibold ${tx.type === "income" ? "text-emerald-500" : tx.type === "savings" ? "text-[#9B5FFA]" : "text-rose-500"}`}>
                        {tx.type === "income" ? "+" : tx.type === "savings" ? "" : "-"}{formatCurrency(Math.abs(Number(tx.amount)), currency)}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={(e) => { e.stopPropagation(); openEdit(tx); }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); setDeleteId(tx.id); }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteId != null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar transação?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação é permanente e não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
