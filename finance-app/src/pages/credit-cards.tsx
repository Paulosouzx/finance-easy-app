import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCreditCards, createCreditCard, updateCreditCard, deleteCreditCard } from "@/services/creditCards";
import { getAccounts } from "@/services/accounts";
import { getTransactions } from "@/services/transactions";
import { Plus, CreditCard as CardIcon, Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const EMPTY_FORM = { name: "", brand: "", credit_limit: "", closing_day: "1", due_day: "10", account_id: "" };

export default function CreditCards() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: cards, isLoading } = useQuery({ queryKey: ["credit-cards"], queryFn: getCreditCards });
  const { data: accounts } = useQuery({ queryKey: ["accounts"], queryFn: getAccounts });
  const { data: transactions } = useQuery({ queryKey: ["transactions"], queryFn: () => getTransactions() });

  const enriched = useMemo(() => {
    if (!cards) return [];
    return cards.map(card => {
      const usedAmount = (transactions ?? [])
        .filter(t => t.card_id === card.id && t.status === "pending")
        .reduce((sum, t) => sum + Number(t.amount), 0);
      return { ...card, usedAmount };
    });
  }, [cards, transactions]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(card: NonNullable<typeof cards>[number]) {
    setEditingId(card.id);
    setForm({
      name: card.name ?? "",
      brand: card.brand ?? "",
      credit_limit: String(card.credit_limit ?? ""),
      closing_day: String(card.closing_day ?? "1"),
      due_day: String(card.due_day ?? "10"),
      account_id: card.account_id ?? "",
    });
    setModalOpen(true);
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!form.account_id) throw new Error("Escolhe uma conta");
      const payload = {
        name: form.name,
        brand: form.brand,
        credit_limit: Number(form.credit_limit) || 0,
        closing_day: Number(form.closing_day) || 1,
        due_day: Number(form.due_day) || 1,
        account_id: form.account_id,
      };
      if (editingId) return updateCreditCard(editingId, payload);
      return createCreditCard(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credit-cards"] });
      setModalOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
    },
    onError: (err) => {
      toast({ title: "Não foi possível guardar o cartão", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCreditCard(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credit-cards"] });
      setDeleteId(null);
    },
    onError: (err) => {
      toast({ title: "Não foi possível eliminar o cartão", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Cartões de Crédito</h2>
          <p className="text-muted-foreground">Gere os teus cartões de crédito e faturas.</p>
        </div>
        <Dialog open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) setEditingId(null); }}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Cartão
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar cartão" : "Novo cartão"}</DialogTitle>
              <DialogDescription>Regista um cartão de crédito associado a uma das tuas contas.</DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate();
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="card-name">Nome</Label>
                <Input id="card-name" required value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Cartão Millennium" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="card-brand">Bandeira</Label>
                <Input id="card-brand" value={form.brand} onChange={(e) => setForm(f => ({ ...f, brand: e.target.value }))} placeholder="Ex: Visa, Mastercard" />
              </div>
              <div className="space-y-1.5">
                <Label>Conta associada</Label>
                <Select value={form.account_id} onValueChange={(v) => setForm(f => ({ ...f, account_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Escolhe uma conta" /></SelectTrigger>
                  <SelectContent>
                    {accounts?.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="card-limit">Limite de crédito</Label>
                <Input id="card-limit" type="number" step="0.01" required value={form.credit_limit} onChange={(e) => setForm(f => ({ ...f, credit_limit: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="card-closing">Dia de fecho</Label>
                  <Input id="card-closing" type="number" min="1" max="31" required value={form.closing_day} onChange={(e) => setForm(f => ({ ...f, closing_day: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="card-due">Dia de vencimento</Label>
                  <Input id="card-due" type="number" min="1" max="31" required value={form.due_day} onChange={(e) => setForm(f => ({ ...f, due_day: e.target.value }))} />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingId ? "Guardar Alterações" : "Criar cartão"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)
        ) : enriched.length === 0 ? (
          <div className="col-span-full p-6 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed">Nenhum cartão encontrado. Cria um para começar.</div>
        ) : (
          enriched.map(card => {
            const limit = Number(card.credit_limit ?? 0);
            const usedPercentage = limit > 0 ? Math.min((card.usedAmount / limit) * 100, 100) : 0;
            return (
              <Card key={card.id} className="relative overflow-hidden group hover:border-primary/50 transition-all cursor-pointer" onClick={() => openEdit(card)}>
                <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-2 min-w-0">
                      <CardIcon className="w-5 h-5 text-muted-foreground shrink-0" />
                      <span className="font-semibold truncate">{card.name}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {card.brand && (
                        <span className="text-xs font-medium px-2 py-1 rounded bg-secondary text-secondary-foreground uppercase mr-1">{card.brand}</span>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); openEdit(card); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteId(card.id); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-muted-foreground">Limite usado</span>
                        <span className="font-medium">€{card.usedAmount.toFixed(2)} / €{limit.toFixed(2)}</span>
                      </div>
                      <Progress value={usedPercentage} className="h-2" />
                    </div>
                    <div className="flex justify-between text-sm pt-4 border-t">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-xs">Fecha</span>
                        <span className="font-medium">Dia {card.closing_day}</span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-muted-foreground text-xs">Vence</span>
                        <span className="font-medium">Dia {card.due_day}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <AlertDialog open={deleteId != null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar cartão?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação é permanente. As transações associadas a este cartão não serão eliminadas.</AlertDialogDescription>
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
