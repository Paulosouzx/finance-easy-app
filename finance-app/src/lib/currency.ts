export type CurrencyCode = "EUR" | "USD" | "BRL";

export const CURRENCY_OPTIONS: { code: CurrencyCode; label: string; symbol: string }[] = [
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "USD", label: "Dólar Americano", symbol: "$" },
  { code: "BRL", label: "Real Brasileiro", symbol: "R$" },
];

const LOCALE_BY_CURRENCY: Record<CurrencyCode, string> = {
  EUR: "pt-PT",
  USD: "en-US",
  BRL: "pt-BR",
};

function normalizeCurrency(currency?: string | null): CurrencyCode {
  return (CURRENCY_OPTIONS.some((c) => c.code === currency) ? currency : "EUR") as CurrencyCode;
}

export function formatCurrency(value: number | null | undefined, currency?: string | null): string {
  const code = normalizeCurrency(currency);
  const amount = Number(value) || 0;
  return new Intl.NumberFormat(LOCALE_BY_CURRENCY[code], { style: "currency", currency: code }).format(amount);
}

export function getCurrencySymbol(currency?: string | null): string {
  return CURRENCY_OPTIONS.find((c) => c.code === normalizeCurrency(currency))?.symbol ?? "€";
}
