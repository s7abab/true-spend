import { POPULAR_TERRITORY_TO_CURRENCY, isPopularMarketCurrency } from '@/utils/currencyList';

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

function currencyFromNavigator(): string | null {
  if (typeof navigator === 'undefined') return null;
  try {
    const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
    for (const lang of langs) {
      const region = new Intl.Locale(lang).maximize().region;
      if (region) {
        const cur = POPULAR_TERRITORY_TO_CURRENCY[region];
        if (cur && isValidCurrencyCode(cur) && isPopularMarketCurrency(cur)) return cur;
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function fetchJson(url: string, ms: number): Promise<unknown> {
  const res = await fetch(url, {
    credentials: 'omit',
    signal: typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal
      ? AbortSignal.timeout(ms)
      : undefined,
  });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

/**
 * Best-effort currency for the user's region (IP geolocation, then browser locale).
 * Only returns codes from the launch market set (10 popular countries / currencies).
 * Cached for the browser session to limit external calls.
 */
export async function inferCurrencyFromLocation(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  const sessionKey = 'truspend_infer_currency_v1';
  try {
    const hit = sessionStorage.getItem(sessionKey);
    if (hit) {
      if (isValidCurrencyCode(hit) && isPopularMarketCurrency(hit)) return hit;
      sessionStorage.removeItem(sessionKey);
    }
  } catch {
    /* private mode */
  }

  const tryEndpoints = async (): Promise<string | null> => {
    try {
      const j = (await fetchJson('https://ipwho.is/', 8000)) as {
        success?: boolean;
        currency?: { code?: string };
        country_code?: string;
      };
      if (j?.success && j.currency?.code) {
        const fromApi = j.currency.code.toUpperCase();
        if (isPopularMarketCurrency(fromApi) && isValidCurrencyCode(fromApi)) return fromApi;
      }
      if (j?.country_code) {
        const c = POPULAR_TERRITORY_TO_CURRENCY[j.country_code];
        if (c && isValidCurrencyCode(c) && isPopularMarketCurrency(c)) return c;
      }
    } catch {
      /* try next */
    }

    try {
      const j2 = (await fetchJson('https://ipapi.co/json/', 8000)) as { currency?: string; error?: boolean };
      if (!j2?.error && j2.currency) {
        const fromApi = j2.currency.toUpperCase();
        if (isPopularMarketCurrency(fromApi) && isValidCurrencyCode(fromApi)) return fromApi;
      }
    } catch {
      /* ignore */
    }

    try {
      const j3 = (await fetchJson('https://get.geojs.io/v1/ip/country.json', 6000)) as { country?: string };
      const cc = j3?.country?.trim?.().toUpperCase();
      if (cc) {
        const c = POPULAR_TERRITORY_TO_CURRENCY[cc];
        if (c && isValidCurrencyCode(c) && isPopularMarketCurrency(c)) return c;
      }
    } catch {
      /* ignore */
    }

    return null;
  };

  let code = await tryEndpoints();
  if (!code) code = currencyFromNavigator();

  if (!code || !isValidCurrencyCode(code) || !isPopularMarketCurrency(code)) return null;

  try {
    sessionStorage.setItem(sessionKey, code);
  } catch {
    /* ignore */
  }
  return code;
}
