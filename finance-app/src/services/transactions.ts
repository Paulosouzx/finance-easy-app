import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/supabase.types";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
type TransactionInsert = Database["public"]["Tables"]["transactions"]["Insert"];
type TransactionUpdate = Database["public"]["Tables"]["transactions"]["Update"];

export type TransactionFilters = {
  accountId?: string;
  type?: "income" | "expense";
  status?: "paid" | "pending";
  month?: string;
  categoryId?: string;
};

export async function getTransactions(filters: TransactionFilters = {}): Promise<Transaction[]> {
  let query = supabase
    .from("transactions")
    .select("*, categories(name, icon, color), credit_cards(name)")
    .order("date", { ascending: false });

  if (filters.accountId) query = query.eq("account_id", filters.accountId);
  if (filters.type) query = query.eq("type", filters.type);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.month) {
    const start = `${filters.month}-01`;
    const [y, m] = filters.month.split("-").map(Number);
    const end = new Date(y, m, 0).toISOString().split("T")[0];
    query = query.gte("date", start).lte("date", end);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createTransaction(input: Omit<TransactionInsert, "created_by">): Promise<Transaction> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  const { data, error } = await supabase
    .from("transactions")
    .insert({ ...input, created_by: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTransaction(id: string, input: TransactionUpdate): Promise<Transaction> {
  const { data, error } = await supabase
    .from("transactions")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw error;
}
