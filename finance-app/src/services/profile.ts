import { supabase } from "@/lib/supabase";

export type AppTheme = "light" | "dark" | "green-light" | "green-dark";

export interface Profile {
  id: string;
  theme: AppTheme;
  enabled_modules: string[];
  name: string;
  email: string | null;
  avatar_url: string | null;
  currency: string;
}

export async function getProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (error) return null;
  return {
    ...data,
    theme: (data.theme as AppTheme) ?? "dark",
    enabled_modules: (data.enabled_modules as string[]) ?? ["dashboard", "transactions", "accounts"],
  };
}

export async function updateProfile(input: Partial<Pick<Profile, "theme" | "enabled_modules" | "name" | "currency">>): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("profiles").update(input).eq("id", user.id);
}