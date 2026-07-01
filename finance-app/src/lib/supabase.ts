import { createClient } from "@supabase/supabase-js";
import type { Database } from "./supabase.types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[FinanceApp] Supabase não está configurado.\n" +
    "Cria um ficheiro .env na raiz do projeto com:\n" +
    "  VITE_SUPABASE_URL=https://<projeto>.supabase.co\n" +
    "  VITE_SUPABASE_ANON_KEY=<anon-key>\n" +
    "Consulta SETUP.md para instruções completas."
  );
}

export const supabase = createClient<Database>(
  supabaseUrl ?? "https://placeholder.supabase.co",
  supabaseAnonKey ?? "placeholder-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
