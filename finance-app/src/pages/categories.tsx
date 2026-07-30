import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCategories, createCategory, updateCategory, deleteCategory } from "@/services/categories";
import {
  Plus, Pencil, Trash2,
  ShoppingCart, Car, Home, Heart, Zap, Coffee, Utensils, Shirt,
  BookOpen, Briefcase, Music, Camera, Plane, Train, Bike, Gift,
  Star, TrendingUp, DollarSign, Leaf, Gamepad2, Headphones,
  Wrench, Package, Wallet, Baby, Dumbbell, Stethoscope, GraduationCap,
  UtensilsCrossed, ShoppingBag, PiggyBank, Landmark,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const ICON_OPTIONS = [
  { key: "ShoppingCart", icon: ShoppingCart }, { key: "Car", icon: Car }, { key: "Home", icon: Home },
  { key: "Heart", icon: Heart }, { key: "Zap", icon: Zap }, { key: "Coffee", icon: Coffee },
  { key: "Utensils", icon: Utensils }, { key: "Shirt", icon: Shirt }, { key: "BookOpen", icon: BookOpen },
  { key: "Briefcase", icon: Briefcase }, { key: "Music", icon: Music }, { key: "Camera", icon: Camera },
  { key: "Plane", icon: Plane }, { key: "Train", icon: Train }, { key: "Bike", icon: Bike },
  { key: "Gift", icon: Gift }, { key: "Star", icon: Star }, { key: "TrendingUp", icon: TrendingUp },
  { key: "DollarSign", icon: DollarSign }, { key: "Leaf", icon: Leaf }, { key: "Gamepad2", icon: Gamepad2 },
  { key: "Headphones", icon: Headphones }, { key: "Wrench", icon: Wrench }, { key: "Package", icon: Package },
  { key: "Wallet", icon: Wallet }, { key: "Baby", icon: Baby }, { key: "Dumbbell", icon: Dumbbell },
  { key: "Stethoscope", icon: Stethoscope }, { key: "GraduationCap", icon: GraduationCap },
  { key: "UtensilsCrossed", icon: UtensilsCrossed }, { key: "ShoppingBag", icon: ShoppingBag },
  { key: "PiggyBank", icon: PiggyBank }, { key: "Landmark", icon: Landmark },
];

const ICON_MAP = Object.fromEntries(ICON_OPTIONS.map(i => [i.key, i.icon]));

const COLOR_PALETTE = [
  "#7B2FF7", "#10B981", "#3B82F6", "#F59E0B",
  "#EF4444", "#8B5CF6", "#06B6D4", "#F97316",
  "#EC4899", "#6B7280", "#84CC16", "#14B8A6",
];

type CategoryForm = {
  name: string;
  type: "income" | "expense" | "both";
  icon: string;
  color: string;
  parentId: string;
};

const DEFAULT_FORM: CategoryForm = {
  name: "",
  type: "expense",
  icon: "ShoppingCart",
  color: "#7B2FF7",
  parentId: "",
};

function CategoryIcon({ name, color }: { name?: string | null; color?: string | null }) {
  const Ic = name ? ICON_MAP[name] : null;
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
      style={{ backgroundColor: color ? `${color}22` : "var(--secondary)", color: color || "var(--foreground)" }}
    >
      {Ic ? <Ic className="w-5 h-5" /> : <Package className="w-5 h-5" />}
    </div>
  );
}

export default function Categories() {
  const queryClient = useQueryClient();
  const { data: categories, isLoading } = useQuery({ queryKey: ["categories"], queryFn: getCategories });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryForm>(DEFAULT_FORM);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { topLevel, byParent } = useMemo(() => {
    const all = categories ?? [];
    const topLevel = all.filter(c => !c.parent_id);
    const byParent = new Map<string, typeof all>();
    all.forEach(c => {
      if (c.parent_id) {
        const list = byParent.get(c.parent_id) ?? [];
        list.push(c);
        byParent.set(c.parent_id, list);
      }
    });
    return { topLevel, byParent };
  }, [categories]);

  function openCreate() {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setModalOpen(true);
  }

  function openEdit(cat: NonNullable<typeof categories>[number]) {
    setEditingId(cat.id);
    setForm({
      name: cat.name ?? "",
      type: (cat.type as CategoryForm["type"]) ?? "expense",
      icon: cat.icon ?? "ShoppingCart",
      color: cat.color ?? "#7B2FF7",
      parentId: cat.parent_id ?? "",
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        icon: form.icon,
        color: form.color,
        parent_id: form.parentId || null,
      };
      if (editingId) {
        await updateCategory(editingId, payload);
      } else {
        await createCategory(payload);
      }
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    await deleteCategory(deleteId);
    await queryClient.invalidateQueries({ queryKey: ["categories"] });
    setDeleteId(null);
  }

  const typeLabel = (t: string) =>
    t === "income" ? "Receita" : t === "expense" ? "Despesa" : "Ambos";

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Categorias</h2>
          <p className="text-muted-foreground">Organiza e classifica as tuas transações.</p>
        </div>
        <Button className="w-full sm:w-auto" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Categoria
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-5 w-1/4" />
                </div>
              ))
            ) : topLevel.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">Nenhuma categoria encontrada.</div>
            ) : (
              topLevel.map(cat => {
                const subs = byParent.get(cat.id) ?? [];
                return (
                  <div key={cat.id}>
                    <div className="flex items-center justify-between p-4 hover:bg-muted/40 transition-colors">
                      <div className="flex items-center gap-4 min-w-0">
                        <CategoryIcon name={cat.icon} color={cat.color} />
                        <div className="min-w-0">
                          <p className="font-medium leading-none truncate">{cat.name}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Badge variant="outline" className="text-[10px] capitalize">{typeLabel(cat.type ?? "expense")}</Badge>
                            {!cat.is_system && <Badge variant="secondary" className="text-[10px]">Personalizada</Badge>}
                            {subs.length > 0 && <Badge variant="outline" className="text-[10px]">{subs.length} subcategorias</Badge>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(cat)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {!cat.is_system && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(cat.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {subs.map(sub => (
                      <div key={sub.id} className="flex items-center justify-between py-3 pl-16 pr-4 hover:bg-muted/30 transition-colors border-t border-border/50">
                        <div className="flex items-center gap-3 min-w-0">
                          <CategoryIcon name={sub.icon} color={sub.color} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium leading-none truncate">{sub.name}</p>
                            <Badge variant="outline" className="text-[10px] mt-1.5 capitalize">{typeLabel(sub.type ?? "expense")}</Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => openEdit(sub)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          {!sub.is_system && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(sub.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input placeholder="Ex: Alimentação" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>

            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as CategoryForm["type"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Despesa</SelectItem>
                  <SelectItem value="income">Receita</SelectItem>
                  <SelectItem value="both">Ambos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Subcategoria de (opcional)</Label>
              <Select value={form.parentId || "none"} onValueChange={v => setForm(f => ({ ...f, parentId: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Categoria principal (sem pai)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Categoria principal —</SelectItem>
                  {topLevel.filter(c => c.id !== editingId).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Ícone</Label>
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 p-3 bg-secondary/50 rounded-lg max-h-36 overflow-y-auto">
                {ICON_OPTIONS.map(({ key, icon: Ic }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, icon: key }))}
                    className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center transition-all",
                      form.icon === key ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Ic className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2 p-3 bg-secondary/50 rounded-lg">
                {COLOR_PALETTE.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, color }))}
                    className={cn("w-7 h-7 rounded-full transition-all border-2", form.color === color ? "border-foreground scale-110 shadow" : "border-transparent hover:scale-105")}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
              <CategoryIcon name={form.icon} color={form.color} />
              <div>
                <p className="font-medium text-sm">{form.name || "Nome da categoria"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{typeLabel(form.type)}</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving ? "A guardar…" : editingId ? "Guardar Alterações" : "Criar Categoria"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId != null} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar categoria?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação é permanente. Transações existentes nesta categoria não serão afetadas.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}