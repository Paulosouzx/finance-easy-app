import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  getAccountMemberProfiles,
  removeAccountMember,
  type AccountMemberProfile,
} from "@/services/accounts";

const MAX_VISIBLE = 3;
const roleLabel: Record<string, string> = { owner: "Dono", member: "Membro", viewer: "Visualizador" };

export function AccountMemberAvatars({ accountId, onAddClick }: { accountId: string; onAddClick: () => void }) {
  const [selected, setSelected] = useState<AccountMemberProfile | null>(null);

  const { data: members } = useQuery({
    queryKey: ["account-member-profiles", accountId],
    queryFn: () => getAccountMemberProfiles(accountId),
  });

  if (!members?.length) {
    return (
      <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={onAddClick}>
        <Users className="w-4 h-4 mr-1.5" />
        Partilhar
      </Button>
    );
  }

  const visible = members.slice(0, MAX_VISIBLE);
  const overflow = members.length - visible.length;

  return (
    <>
      <div className="flex items-center -space-x-2">
        {visible.map((m, i) =>
          overflow > 0 && i === visible.length - 1 ? (
            <button
              key={m.member_id}
              type="button"
              onClick={onAddClick}
              className="h-8 w-8 rounded-full ring-2 ring-background bg-muted flex items-center justify-center text-[11px] font-medium text-muted-foreground hover:bg-muted/70 transition-colors"
              title={`+${overflow} membro(s)`}
            >
              +{overflow}
            </button>
          ) : (
            <button
              key={m.member_id}
              type="button"
              onClick={() => setSelected(m)}
              className="rounded-full ring-2 ring-background transition-transform hover:-translate-y-0.5"
              title={m.name}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={m.avatar_url ?? undefined} />
                <AvatarFallback className="text-[11px]">{m.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            </button>
          )
        )}
        <button
          type="button"
          onClick={onAddClick}
          className="h-8 w-8 rounded-full ring-2 ring-background bg-secondary flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
          title="Adicionar pessoa"
        >
          <span className="text-base leading-none">+</span>
        </button>
      </div>

      <MemberDetailModal
        accountId={accountId}
        member={selected}
        onClose={() => setSelected(null)}
      />
    </>
  );
}

function MemberDetailModal({
  accountId,
  member,
  onClose,
}: {
  accountId: string;
  member: AccountMemberProfile | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => removeAccountMember(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account-member-profiles", accountId] });
      queryClient.invalidateQueries({ queryKey: ["account-members", accountId] });
      toast({ title: "Acesso removido" });
      onClose();
    },
    onError: (err) => {
      toast({ title: "Não foi possível remover", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    },
  });

  return (
    <Dialog open={!!member} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        {member && (
          <>
            <DialogHeader>
              <DialogTitle>Detalhes do membro</DialogTitle>
            </DialogHeader>

            <div className="flex flex-col items-center text-center gap-3 py-2">
              <Avatar className="h-16 w-16">
                <AvatarImage src={member.avatar_url ?? undefined} />
                <AvatarFallback className="text-lg">{member.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold leading-none">{member.name}</p>
                <p className="text-sm text-muted-foreground mt-1">@{member.username}</p>
              </div>
              <Badge variant="outline">{roleLabel[member.role] ?? member.role}</Badge>
              <p className="text-xs text-muted-foreground">
                Membro desde {new Date(member.created_at).toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" })}
              </p>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                className="border-rose-500/30 text-rose-500 hover:bg-rose-500/10 hover:text-rose-500"
                disabled={removeMutation.isPending}
                onClick={() => removeMutation.mutate(member.member_id)}
              >
                Remover acesso
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
