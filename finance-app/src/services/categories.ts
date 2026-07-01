import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/supabase.types";

type Category = Database["public"]["Tables"]["categories"]["Row"];
type CategoryInsert = Database["public"]["Tables"]["categories"]["Insert"];
type CategoryUpdate = Database["public"]["Tables"]["categories"]["Update"];

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createCategory(input: Omit<CategoryInsert, "user_id" | "is_system">): Promise<Category> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("categories")
    .insert({ ...input, user_id: user?.id ?? null, is_system: false })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCategory(id: string, input: CategoryUpdate): Promise<Category> {
  const { data, error } = await supabase
    .from("categories")
    .update(input)
    .eq("id", id)
    .eq("is_system", false)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("is_system", false);
  if (error) throw error;
}
