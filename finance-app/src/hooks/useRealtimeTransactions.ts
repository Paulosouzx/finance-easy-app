import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

type RealtimeCallback = (payload: {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: Record<string, unknown>;
  old: Record<string, unknown>;
}) => void;

/**
 * Subscreve a alterações em tempo real na tabela `transactions`.
 * Ativa automaticamente quando o Supabase está configurado.
 *
 * Requisitos:
 * 1. Ativar Realtime no painel Supabase > Database > Replication > transactions
 * 2. O utilizador deve estar autenticado
 *
 * @param accountId - Filtrar por conta (opcional)
 * @param onEvent - Callback chamado em INSERT, UPDATE ou DELETE
 */
export function useRealtimeTransactions(
  accountId: string | undefined,
  onEvent: RealtimeCallback
) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured() || !accountId) return;

    const channel = supabase
      .channel(`transactions:${accountId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `account_id=eq.${accountId}`,
        },
        (payload) => {
          onEvent({
            eventType: payload.eventType as "INSERT" | "UPDATE" | "DELETE",
            new: payload.new as Record<string, unknown>,
            old: payload.old as Record<string, unknown>,
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [accountId, onEvent]);
}
