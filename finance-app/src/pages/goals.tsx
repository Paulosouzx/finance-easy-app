import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getGoals, createGoal, updateGoal, deleteGoal } from "@/services/goals";
import { Plus, Target, Pencil, Trash2, Loader2 } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { format, differenceInMonths } from "date-fns";

const EMPTY_FORM = { name: "", target_amount: "", current_amount: "0", deadline: "" };

export default function Goals() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: goals, isLoading } = useQuery({ queryKey: ["goals"], queryFn: getGoals });

  const enriched = useMemo(() => {
    if (!goals) return [];
    return goals.map(g => {
      const current = Number(g.current_amount ?? 0);
      const target = Number(g.target_amount ?? 0);
      const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
      const monthsLeft = g.deadline ? Math.max(differenceInMonths(new Date(g.deadline), new Date()), 1) : null;
      const remaining = target - current;
      const monthlyRequired = monthsLeft && remaining > 0 ? remaining / monthsLeft : null;
      return { ...g, percentage, monthlyRequired };
    });
  }, [goals]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(goal: NonNullable<typeof goals>[number]) {
    setEditingId(goal.id);
    setForm({
      name: goal.name ?? "",
      target_amount: String(goal.target_amount ?? ""),
      current_amount: String(goal.current_amount ?? "0"),
      deadline: goal.deadline ?? "",
    });
    setModalOpen(true);
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name,
        target_amount: Number(form.target_amount) || 0,
        current_amount: Number(form.current_amount) || 0,
        deadline: form.deadline || null,
        color: null,
        icon: null,
      };
      if (editingId) return updateGoal(editingId, payload);
      return createGoal(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      setModalOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
    },
    onError: (err) => {
      toast({ title: "Não foi possível guardar a meta", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteGoal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      setDeleteId(null);
    },
    onError: (err) => {
      toast({ title: "Não foi possível eliminar a meta", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Metas de Poupança</h2>
          <p className="text-muted-foreground">Planeia o futuro e acompanha o teu progresso.</p>
        </div>
        <Dialog open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) setEditingId(null); }}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Meta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar meta" : "Nova meta"}</DialogTitle>
              <DialogDescription>Define um objetivo de poupança e acompanha a tua evolução.</DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate();
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="goal-name">Nome</Label>
                <Input id="goal-name" required value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Fundo de emergência" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="goal-target">Valor alvo</Label>
                  <Input id="goal-target" type="number" step="0.01" required value={form.target_amount} onChange={(e) => setForm(f => ({ ...f, target_amount: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="goal-current">Valor atual</Label>
                  <Input id="goal-current" type="number" step="0.01" value={form.current_amount} onChange={(e) => setForm(f => ({ ...f, current_amount: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="goal-deadline">Prazo (opcional)</Label>
                <Input id="goal-deadline" type="date" value={form.deadline} onChange={(e) => setForm(f => ({ ...f, deadline: e.target.value }))} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingId ? "Guardar Alterações" : "Criar meta"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)
        ) : enriched.length === 0 ? (
          <div className="col-span-full p-6 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed">Nenhuma meta de poupança encontrada.</div>
        ) : (
          enriched.map(goal => (
            <Card key={goal.id} className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => openEdit(goal)}>
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10 text-primary shrink-0">
                      <Target className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold truncate">{goal.name}</h4>
                      {goal.deadline && (
                        <p className="text-xs text-muted-foreground">Até {format(new Date(goal.deadline), "MMM yyyy")}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); openEdit(goal); }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteId(goal.id); }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium">€{Number(goal.current_amount).toFixed(2)}</span>
                      <span className="text-muted-foreground">de €{Number(goal.target_amount).toFixed(2)}</span>
                    </div>
                    <Progress value={goal.percentage} className="h-2" />
                  </div>
                  {goal.monthlyRequired && (
                    <p className="text-xs text-muted-foreground text-center pt-2 border-t">
                      Precisas de <span className="font-medium text-foreground">€{goal.monthlyRequired.toFixed(2)}</span> / mês para atingir a meta
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <AlertDialog open={deleteId != null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar meta?</AlertDialogTitle>
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
