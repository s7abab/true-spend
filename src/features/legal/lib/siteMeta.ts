/** Public marketing / legal contact (optional). Replace in production `.env`. */
export function publicContactEmail(): string {
  const v = import.meta.env.VITE_PUBLIC_CONTACT_EMAIL?.trim();
  return v || 'hello@truspend.app';
}

export function publicSiteOrigin(): string {
  const v = import.meta.env.VITE_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
  if (v) return v;
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}
