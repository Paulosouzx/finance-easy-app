# Avatares de partilha na conta — Design

Data: 2026-08-17

## Contexto

Hoje, quando uma conta está partilhada, o dono só vê um botão "Partilhar" (`finance-app/src/pages/accounts.tsx:306-316`) que abre `ShareAccountDialog` — uma lista em texto puro (sem foto) dos membros convidados. Não há indicação visual de quem já tem acesso.

## Objetivo

Quando a conta tiver pelo menos um membro aceite, mostrar as fotos de perfil dessas pessoas no card da conta (em vez do botão "Partilhar"), com um botão "+" para convidar mais alguém. Clicar numa foto abre um modal com os detalhes da pessoa.

## Escopo

- Visível **só para o dono** da conta. Membros convidados continuam vendo apenas o badge "Partilhada", sem UI de gestão.
- Só membros com `status = 'accepted'` entram no stack de avatares. Convites pendentes não aparecem ali — enquanto não houver nenhum aceite, o botão "Partilhar" continua a aparecer normalmente.
- `ShareAccountDialog` (busca, convite, lista de membros em texto) fica **inalterado** — continua sendo o mecanismo de adicionar/remover membros.

## Backend

### Migration `finance-app/supabase/migrations/015_account_member_profiles.sql`

Nova RPC `get_account_member_profiles(p_account_id uuid)`:

- `language sql security definer stable`.
- Retorna `member_id uuid, user_id uuid, role text, invited_email text, created_at timestamptz, name text, username text, avatar_url text`.
- Filtra `account_members.status = 'accepted'` e `account_members.account_id = p_account_id`.
- Só devolve linhas se `auth.uid()` for owner da conta ou membro aceite dela (mesma regra da policy `account_members_select` em `002_debt_accounts_and_rls.sql`) — caso contrário, resultado vazio.
- `grant execute on function public.get_account_member_profiles(uuid) to authenticated;`

Necessário porque a policy `profiles_select_own` (`002_debt_accounts_and_rls.sql:41-43`) restringe leitura de `profiles` à própria linha — não dá para fazer join direto no cliente. Mesmo padrão já usado em `search_profiles` (`003_user_search_and_invite.sql`) e `get_pending_invites` (`004_fix_pending_invite_account_visibility.sql`).

## Service layer

Em `finance-app/src/services/accounts.ts`, nova função:

```ts
export type AccountMemberProfile = Database["public"]["Functions"]["get_account_member_profiles"]["Returns"][number];

export async function getAccountMemberProfiles(accountId: string): Promise<AccountMemberProfile[]> {
  const { data, error } = await supabase.rpc("get_account_member_profiles", { p_account_id: accountId });
  if (error) throw error;
  return data ?? [];
}
```

(Tipos gerados via `generate_typescript_types` depois de aplicar a migration, ou tipagem manual equivalente em `supabase.types.ts` caso a geração automática não esteja disponível no fluxo local.)

## Frontend

### Novo componente `finance-app/src/components/account-member-avatars.tsx`

**`AccountMemberAvatars({ accountId, onAddClick }: { accountId: string; onAddClick: () => void })`**

- `useQuery({ queryKey: ["account-member-profiles", accountId], queryFn: () => getAccountMemberProfiles(accountId) })`.
- Se `members.length === 0`: renderiza o mesmo `<Button>` "Partilhar" que existe hoje em `accounts.tsx:307-315`, `onClick={onAddClick}`.
- Se `members.length > 0`: renderiza stack de avatares sobrepostos:
  - Até 3 avatares visíveis (`Avatar` do design system, `AvatarImage` + `AvatarFallback` com iniciais), `-space-x-2`, borda para destacar do fundo (`ring-2 ring-background`).
  - Se houver mais de 3, o 3º slot vira uma bolha "+N" (resto) em vez de avatar, abre `ShareAccountDialog` ao clicar (mesmo destino do "+").
  - Cada avatar individual (dentro do limite de 3) é clicável → abre `MemberDetailModal` com esse membro.
  - Botão circular "+" ao fim do stack, mesmo estilo visual dos avatares, `onClick={onAddClick}`.

**`MemberDetailModal`** (sub-componente no mesmo arquivo, controlado por state interno `selectedMember`)

- `Dialog`/`DialogContent` padrão (`finance-app/src/components/ui/dialog.tsx`), mesma animação Tailwind (`animate-in fade-in-0 zoom-in-95`) que os outros modais do app — nada de biblioteca nova.
- Conteúdo: avatar grande (h-16 w-16), nome, `@username`, badge do papel (`role`), texto "Membro desde {data formatada}".
- Botão "Remover acesso": chama `removeAccountMember(member.member_id)` via `useMutation`, mesmo padrão sem confirmação extra que `ShareAccountDialog` já usa (`removeMutation` em `accounts.tsx:392-395`). `onSuccess`: invalida `["account-member-profiles", accountId]` e `["account-members", accountId]`, fecha o modal.

### `finance-app/src/pages/accounts.tsx`

Substitui o bloco:

```tsx
{isOwner && (
  <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => setShareAccountId(account.id)}>
    <Users className="w-4 h-4 mr-1.5" />
    Partilhar
  </Button>
)}
```

por:

```tsx
{isOwner && (
  <AccountMemberAvatars accountId={account.id} onAddClick={() => setShareAccountId(account.id)} />
)}
```

Resto do arquivo, incluindo `ShareAccountDialog` (linhas 352-508), fica sem alterações.

## Realtime

Em `finance-app/src/hooks/use-realtime-sync.ts`, no listener `account_members` (linhas 23-27), adiciona:

```ts
queryClient.invalidateQueries({ queryKey: ["account-member-profiles"] });
```

para o stack de avatares atualizar sozinho quando um membro aceita, sai ou é removido por outra sessão.

## Fora de escopo

- Lista de membros dentro do `ShareAccountDialog` continua em texto puro, sem avatar — não será tocada.
- Upload de foto de perfil (não existe hoje; `avatar_url` fica `null` até existir essa feature separada — `AvatarFallback` com iniciais cobre esse caso, já é o comportamento atual em todo o app).
- Membros/convidados não veem o stack — só o dono.
- Sem edição de papel (`role`) a partir do modal.

## Testes / verificação manual

- Conta sem partilha → botão "Partilhar" aparece normal.
- Convite pendente, ninguém aceite → botão "Partilhar" continua aparecendo (não vira stack).
- 1 membro aceite → 1 avatar + botão "+".
- 4+ membros aceites → 3 avatares + bolha "+N" + botão "+".
- Clique em avatar → modal abre com animação, dados corretos, "Remover acesso" funciona e atualiza o stack.
- Segunda sessão (outro browser) aceitando/recusando convite → stack da primeira sessão atualiza via realtime sem reload.
