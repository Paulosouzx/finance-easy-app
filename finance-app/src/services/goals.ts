import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/supabase.types";

type Goal = Database["public"]["Tables"]["goals"]["Row"];
type GoalInsert = Database["public"]["Tables"]["goals"]["Insert"];
type GoalUpdate = Database["public"]["Tables"]["goals"]["Update"];

export async function getGoals(): Promise<Goal[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createGoal(input: Omit<GoalInsert, "user_id">): Promise<Goal> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  const { data, error } = await supabase
    .from("goals")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateGoal(id: string, input: GoalUpdate): Promise<Goal> {
  const { data, error } = await supabase
    .from("goals")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function contributeToGoal(id: string, amount: number): Promise<Goal> {
  const { data: goal, error: fetchError } = await supabase
    .from("goals")
    .select("current_amount")
    .eq("id", id)
    .single();
  if (fetchError) throw fetchError;
  const { data, error } = await supabase
    .from("goals")
    .update({ current_amount: (goal.current_amount ?? 0) + amount })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteGoal(id: string): Promise<void> {
  const { error } = await supabase.from("goals").delete().eq("id", id);
  if (error) throw error;
}
