type TxLike = { account_id: string; type: string; amount: number | string };
type AccountLike = { id: string; balance: number | string };

/**
 * account.balance é o saldo inicial definido na criação da conta.
 * O saldo efetivo tem de somar o efeito de todas as transações dessa conta,
 * já que nada mais atualiza a coluna `balance` na base de dados.
 */
export function computeAccountBalance(account: AccountLike, transactions: TxLike[]): number {
  const initial = Number(account.balance) || 0;
  const net = transactions
    .filter((t) => t.account_id === account.id)
    .reduce((sum, t) => {
      const amount = Number(t.amount) || 0;
      if (t.type === "income") return sum + amount;
      if (t.type === "expense" || t.type === "savings") return sum - amount;
      return sum;
    }, 0);
  return initial + net;
}

export function computeTotalBalance(accounts: AccountLike[], transactions: TxLike[]): number {
  return accounts.reduce((sum, a) => sum + computeAccountBalance(a, transactions), 0);
}
