import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/supabase.types";

type Account = Database["public"]["Tables"]["accounts"]["Row"];
type AccountInsert = Database["public"]["Tables"]["accounts"]["Insert"];
type AccountUpdate = Database["public"]["Tables"]["accounts"]["Update"];

export async function getAccounts(): Promise<Account[]> {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createAccount(input: Omit<AccountInsert, "owner_id">): Promise<Account> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  const { data, error } = await supabase
    .from("accounts")
    .insert({ ...input, owner_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateAccount(id: string, input: AccountUpdate): Promise<Account> {
  const { data, error } = await supabase
    .from("accounts")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAccount(id: string): Promise<void> {
  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) throw error;
}

export async function inviteAccountMember(accountId: string, email: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  const { error } = await supabase.from("account_members").insert({
    account_id: accountId,
    invited_email: email,
    role: "member",
    status: "pending",
  });
  if (error) throw error;
  // TODO: Enviar email de convite via Supabase Edge Function ou email provider
}
