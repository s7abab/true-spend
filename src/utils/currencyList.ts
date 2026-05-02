/**
 * Launch scope: 10 high-traffic markets (ISO 3166-1 alpha-2 → primary ISO 4217).
 * `DE` represents the Eurozone default for EU-style locales without a per-country row.
 */
export const POPULAR_TERRITORY_TO_CURRENCY: Record<string, string> = {
  US: 'USD',
  IN: 'INR',
  GB: 'GBP',
  DE: 'EUR',
  JP: 'JPY',
  BR: 'BRL',
  CA: 'CAD',
  AU: 'AUD',
  CN: 'CNY',
  MX: 'MXN',
};

/** Distinct ISO 4217 codes for the currency picker (same order as territories above, de-duped). */
export const POPULAR_CURRENCY_CODES: readonly string[] = [
  'USD',
  'INR',
  'GBP',
  'EUR',
  'JPY',
  'BRL',
  'CAD',
  'AUD',
  'CNY',
  'MXN',
];

const POPULAR_SET = new Set(POPULAR_CURRENCY_CODES);

function isValidCurrencyCode(code: string): boolean {
  const c = code.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(c)) return false;
  try {
    new Intl.NumberFormat(undefined, { style: 'currency', currency: c, currencyDisplay: 'code' }).format(0);
    return true;
  } catch {
    return false;
  }
}

/** True if the code is one of the supported launch currencies. */
export function isPopularMarketCurrency(code: string): boolean {
  return POPULAR_SET.has(code.trim().toUpperCase());
}

export function listSelectableCurrencyCodes(): string[] {
  const lang = typeof navigator !== 'undefined' ? navigator.language : 'en';
  let dn: Intl.DisplayNames;
  try {
    dn = new Intl.DisplayNames([lang, 'en'], { type: 'currency' });
  } catch {
    dn = new Intl.DisplayNames(['en'], { type: 'currency' });
  }

  return [...POPULAR_CURRENCY_CODES]
    .filter(isValidCurrencyCode)
    .sort((a, b) => {
      const la = dn.of(a) ?? a;
      const lb = dn.of(b) ?? b;
      return la.localeCompare(lb, lang, { sensitivity: 'base' });
    });
}

export function currencyOptionLabel(code: string): string {
  const lang = typeof navigator !== 'undefined' ? navigator.language : 'en';
  try {
    const dn = new Intl.DisplayNames([lang, 'en'], { type: 'currency' });
    const name = dn.of(code) ?? code;
    return `${code} — ${name}`;
  } catch {
    return code;
  }
}
