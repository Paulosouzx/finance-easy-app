import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/supabase.types";

type Account = Database["public"]["Tables"]["accounts"]["Row"];
type AccountInsert = Database["public"]["Tables"]["accounts"]["Insert"];
type AccountUpdate = Database["public"]["Tables"]["accounts"]["Update"];
export type AccountMember = Database["public"]["Tables"]["account_members"]["Row"];
export type PendingInvite = Database["public"]["Functions"]["get_pending_invites"]["Returns"][number];

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

export type ProfileSearchResult = Database["public"]["Functions"]["search_profiles"]["Returns"][number];

export async function searchUsers(query: string): Promise<ProfileSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const { data, error } = await supabase.rpc("search_profiles", { search_query: trimmed });
  if (error) throw error;
  return data ?? [];
}

export async function inviteAccountMember(accountId: string, email: string, userId?: string | null): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  const { error } = await supabase.from("account_members").insert({
    account_id: accountId,
    invited_email: email.trim().toLowerCase(),
    user_id: userId ?? null,
    role: "member",
    status: "pending",
  });
  if (error) throw error;
  // TODO: Enviar email de convite via Supabase Edge Function ou email provider
}

export async function getAccountMembers(accountId: string): Promise<AccountMember[]> {
  const { data, error } = await supabase
    .from("account_members")
    .select("*")
    .eq("account_id", accountId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export type AccountMemberProfile = Database["public"]["Functions"]["get_account_member_profiles"]["Returns"][number];

export async function getAccountMemberProfiles(accountId: string): Promise<AccountMemberProfile[]> {
  const { data, error } = await supabase.rpc("get_account_member_profiles", { p_account_id: accountId });
  if (error) throw error;
  return data ?? [];
}

export async function removeAccountMember(memberId: string): Promise<void> {
  const { error } = await supabase.from("account_members").delete().eq("id", memberId);
  if (error) throw error;
}

/** Convites pendentes dirigidos ao email do utilizador autenticado. */
export async function getPendingInvites(): Promise<PendingInvite[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return [];
  const { data, error } = await supabase.rpc("get_pending_invites");
  if (error) throw error;
  return data ?? [];
}

export async function respondToInvite(memberId: string, accept: boolean): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  const { error } = await supabase
    .from("account_members")
    .update(accept ? { user_id: user.id, status: "accepted" } : { status: "declined" })
    .eq("id", memberId);
  if (error) throw error;
}
