import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";

/** Mantém contas partilhadas, transações e convites sincronizados em tempo real entre utilizadores. */
export function useRealtimeSync() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("shared-data-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "accounts" }, () => {
        queryClient.invalidateQueries({ queryKey: ["accounts"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => {
        queryClient.invalidateQueries({ queryKey: ["transactions"] });
        queryClient.invalidateQueries({ queryKey: ["accounts"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "account_members" }, () => {
        queryClient.invalidateQueries({ queryKey: ["account-members"] });
        queryClient.invalidateQueries({ queryKey: ["account-member-profiles"] });
        queryClient.invalidateQueries({ queryKey: ["pending-invites"] });
        queryClient.invalidateQueries({ queryKey: ["accounts"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);
}
