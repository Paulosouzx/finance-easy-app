import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/supabase.types";

type Budget = Database["public"]["Tables"]["budgets"]["Row"];
type BudgetInsert = Database["public"]["Tables"]["budgets"]["Insert"];
type BudgetUpdate = Database["public"]["Tables"]["budgets"]["Update"];

export async function getBudgets(month?: string): Promise<Budget[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  const currentMonth = month ?? new Date().toISOString().slice(0, 7);
  const { data, error } = await supabase
    .from("budgets")
    .select("*, categories(name, icon, color)")
    .eq("user_id", user.id)
    .eq("month", currentMonth)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createBudget(input: Omit<BudgetInsert, "user_id">): Promise<Budget> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  const { data, error } = await supabase
    .from("budgets")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateBudget(id: string, input: BudgetUpdate): Promise<Budget> {
  const { data, error } = await supabase
    .from("budgets")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBudget(id: string): Promise<void> {
  const { error } = await supabase.from("budgets").delete().eq("id", id);
  if (error) throw error;
}
