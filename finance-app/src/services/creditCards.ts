import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/supabase.types";

type CreditCard = Database["public"]["Tables"]["credit_cards"]["Row"];
type CreditCardInsert = Database["public"]["Tables"]["credit_cards"]["Insert"];
type CreditCardUpdate = Database["public"]["Tables"]["credit_cards"]["Update"];

export async function getCreditCards(): Promise<CreditCard[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  const { data, error } = await supabase
    .from("credit_cards")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getCreditCardUsage(cardId: string): Promise<number> {
  const { data, error } = await supabase
    .from("transactions")
    .select("amount")
    .eq("card_id", cardId)
    .eq("status", "pending");
  if (error) throw error;
  return (data ?? []).reduce((sum, t) => sum + Number(t.amount), 0);
}

export async function createCreditCard(input: Omit<CreditCardInsert, never>): Promise<CreditCard> {
  const { data, error } = await supabase
    .from("credit_cards")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCreditCard(id: string, input: CreditCardUpdate): Promise<CreditCard> {
  const { data, error } = await supabase
    .from("credit_cards")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCreditCard(id: string): Promise<void> {
  const { error } = await supabase.from("credit_cards").delete().eq("id", id);
  if (error) throw error;
}