/** Format a numeric amount with Intl (currency code from profile, default INR). */
export function formatMoney(amount: unknown, currency = 'INR'): string {
  const code = currency && typeof currency === 'string' ? currency.toUpperCase() : 'INR';
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }).format(Math.round(Number(amount) || 0));
  } catch {
    return `₹${Math.round(Number(amount) || 0).toLocaleString('en-IN')}`;
  }
}

/** Narrow symbol for CountUp / keypad (e.g. ₹, $). */
export function currencyPrefix(currency = 'INR'): string {
  const code = currency && typeof currency === 'string' ? currency.toUpperCase() : 'INR';
  try {
    const parts = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
      maximumFractionDigits: 0,
    }).formatToParts(0);
    return parts.find((p) => p.type === 'currency')?.value ?? '₹';
  } catch {
    return '₹';
  }
}
