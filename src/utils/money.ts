/** Format a numeric amount with Intl (currency from profile; locale from the runtime / browser). */
export function formatMoney(amount: unknown, currency = 'INR'): string {
  const code = currency && typeof currency === 'string' ? currency.toUpperCase() : 'INR';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      /** Avoid `US$` / `CA$` style disambiguation where a short symbol is enough. */
      currencyDisplay: 'narrowSymbol',
      maximumFractionDigits: 0,
    }).format(Math.round(Number(amount) || 0));
  } catch {
    return `${code} ${Math.round(Number(amount) || 0).toLocaleString()}`;
  }
}

/** Narrow symbol for keypad / inline amounts (e.g. ₹, $). */
export function currencyPrefix(currency = 'INR'): string {
  const code = currency && typeof currency === 'string' ? currency.toUpperCase() : 'INR';
  try {
    const parts = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
      maximumFractionDigits: 0,
    }).formatToParts(0);
    return parts.find((p) => p.type === 'currency')?.value ?? code.slice(0, 1);
  } catch {
    return code.slice(0, 1);
  }
}
