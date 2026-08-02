-- ============================================================
-- FinanceApp — Notificação push ao alterar conta partilhada
-- ============================================================
-- Sempre que uma transação é criada numa conta que tem pelo menos um
-- membro aceite (i.e. é mesmo partilhada), chama a Edge Function
-- `notify-shared-account-change`, que envia uma notificação push aos
-- outros participantes da conta (dono + membros aceites, excluindo
-- quem fez a alteração).
--
-- A Edge Function está publicada com verify_jwt = false (endpoint
-- interno, sem dados sensíveis na resposta), por isso não é preciso
-- nenhum cabeçalho de autenticação aqui.
-- ============================================================

create extension if not exists pg_net;

create or replace function public.notify_shared_account_change()
returns trigger language plpgsql as $$
declare
  participant_count int;
begin
  select count(*) into participant_count
  from public.account_members am
  where am.account_id = new.account_id and am.status = 'accepted';

  -- Conta não é partilhada (sem membros aceites) — nada a notificar.
  if participant_count = 0 then
    return new;
  end if;

  perform net.http_post(
    url := 'https://kuuwciswftbojaogkgul.supabase.co/functions/v1/notify-shared-account-change',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'account_id', new.account_id,
      'actor_user_id', new.created_by,
      'type', new.type,
      'amount', new.amount,
      'description', new.description
    )
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_shared_account_change on public.transactions;
create trigger trg_notify_shared_account_change
  after insert on public.transactions
  for each row execute function public.notify_shared_account_change();
