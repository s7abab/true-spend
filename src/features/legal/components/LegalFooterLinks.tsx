import { Link } from 'react-router-dom';
import './LegalFooterLinks.css';

type LegalFooterLinksProps = {
  /** Tighter spacing when embedded in profile / small footers */
  variant?: 'inline' | 'footer';
};

const LINKS = [
  { to: '/about', label: 'About' },
  { to: '/privacy', label: 'Privacy' },
  { to: '/terms', label: 'Terms' },
  { to: '/cookies', label: 'Cookies' },
] as const;

export function LegalFooterLinks({ variant = 'footer' }: LegalFooterLinksProps) {
  return (
    <nav className={`legal-footer-links legal-footer-links--${variant}`} aria-label="Legal and company">
      {LINKS.map((l, i) => (
        <span key={l.to} className="legal-footer-links__item">
          {i > 0 ? <span className="legal-footer-links__sep" aria-hidden="true" /> : null}
          <Link to={l.to}>{l.label}</Link>
        </span>
      ))}
    </nav>
  );
}
