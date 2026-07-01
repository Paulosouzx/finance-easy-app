export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          email: string | null;
          avatar_url: string | null;
          theme: string;
          enabled_modules: string[];
          currency: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at"> & { created_at?: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      accounts: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          type: string;
          institution: string | null;
          balance: number;
          currency: string;
          color: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["accounts"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["accounts"]["Insert"]>;
      };
      account_members: {
        Row: {
          id: string;
          account_id: string;
          user_id: string | null;
          role: string;
          invited_email: string;
          status: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["account_members"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["account_members"]["Insert"]>;
      };
      categories: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          icon: string | null;
          color: string | null;
          type: string;
          parent_id: string | null;
          is_system: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["categories"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
      };
      transactions: {
        Row: {
          id: string;
          account_id: string;
          created_by: string;
          category_id: string | null;
          card_id: string | null;
          amount: number;
          type: string;
          description: string;
          date: string;
          status: string;
          recurrence: string;
          tags: string[];
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["transactions"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["transactions"]["Insert"]>;
      };
      credit_cards: {
        Row: {
          id: string;
          account_id: string;
          name: string;
          brand: string;
          credit_limit: number;
          closing_day: number;
          due_day: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["credit_cards"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["credit_cards"]["Insert"]>;
      };
      bills: {
        Row: {
          id: string;
          user_id: string;
          account_id: string | null;
          category_id: string | null;
          name: string;
          amount: number;
          due_date: string;
          status: string;
          recurrence: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["bills"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["bills"]["Insert"]>;
      };
      budgets: {
        Row: {
          id: string;
          user_id: string;
          category_id: string;
          month: string;
          limit_amount: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["budgets"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["budgets"]["Insert"]>;
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          target_amount: number;
          current_amount: number;
          deadline: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["goals"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["goals"]["Insert"]>;
      };
    };
  };
}
