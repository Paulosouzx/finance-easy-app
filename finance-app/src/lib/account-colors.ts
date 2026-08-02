export const ACCOUNT_COLOR_PALETTE = [
  "#7B2FF7", "#10B981", "#3B82F6", "#F59E0B",
  "#EF4444", "#EC4899", "#06B6D4", "#F97316",
  "#8B5CF6", "#84CC16", "#14B8A6", "#6B7280",
];

/** Devolve a cor da conta: a definida pelo utilizador, ou uma cor estável derivada do id. */
export function getAccountColor(account: { id: string; color?: string | null }): string {
  if (account.color) return account.color;
  let hash = 0;
  for (let i = 0; i < account.id.length; i++) {
    hash = (hash * 31 + account.id.charCodeAt(i)) >>> 0;
  }
  return ACCOUNT_COLOR_PALETTE[hash % ACCOUNT_COLOR_PALETTE.length];
}
