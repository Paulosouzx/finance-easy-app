import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/supabase.types";

type Bill = Database["public"]["Tables"]["bills"]["Row"];
type BillInsert = Database["public"]["Tables"]["bills"]["Insert"];
type BillUpdate = Database["public"]["Tables"]["bills"]["Update"];

export async function getBills(): Promise<Bill[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  const { data, error } = await supabase
    .from("bills")
    .select("*, categories(name, icon, color)")
    .eq("user_id", user.id)
    .order("due_date", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createBill(input: Omit<BillInsert, "user_id">): Promise<Bill> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  const { data, error } = await supabase
    .from("bills")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateBill(id: string, input: BillUpdate): Promise<Bill> {
  const { data, error } = await supabase
    .from("bills")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function payBill(id: string, accountId: string): Promise<void> {
  const { data: bill, error: fetchError } = await supabase
    .from("bills")
    .select("*")
    .eq("id", id)
    .single();
  if (fetchError) throw fetchError;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  await supabase.from("transactions").insert({
    account_id: accountId,
    created_by: user.id,
    category_id: bill.category_id,
    card_id: null,
    amount: bill.amount,
    type: "expense",
    description: `Pagamento: ${bill.name}`,
    date: new Date().toISOString().split("T")[0],
    status: "paid",
    recurrence: "once",
    tags: [],
  });

  await supabase.from("bills").update({ status: "paid" }).eq("id", id);
}

export async function deleteBill(id: string): Promise<void> {
  const { error } = await supabase.from("bills").delete().eq("id", id);
  if (error) throw error;
}
