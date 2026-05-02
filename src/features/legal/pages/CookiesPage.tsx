import { Link } from 'react-router-dom';
import { PublicLegalLayout } from '@/features/legal/components/PublicLegalLayout';
import { publicContactEmail } from '@/features/legal/lib/siteMeta';

export function CookiesPage() {
  const contact = publicContactEmail();

  return (
    <PublicLegalLayout title="Cookie notice" documentTitle="Cookies">
      <>
        <p>
          This notice explains how Truspend uses cookies and similar storage on your device. If we add
          non-essential cookies or trackers that require consent in your region, we will show a consent choice
          and update this page.
        </p>

        <h2>What we mean by cookies</h2>
        <p>
          Cookies are small files stored on your device. We also mean similar technologies such as local
          storage and session storage used to keep you signed in or remember UI preferences.
        </p>

        <h2>Strictly necessary</h2>
        <p>
          These are required for core functionality: for example session or auth tokens from our authentication
          provider so you can stay logged in, security-related cookies, and load balancing where used. They do
          not require consent in many jurisdictions because they are essential to provide the service you
          asked for.
        </p>

        <h2>Functional</h2>
        <p>
          We may store optional preferences locally (for example UI choices) so the app remembers them. These
          are not used to track you across other companies&apos; sites.
        </p>

        <h2>Analytics and marketing</h2>
        <p>
          We do not use third-party advertising cookies on Truspend today. If we introduce optional analytics or
          marketing tools later, we will name them here and collect consent where required.
        </p>

        <h2>Third parties</h2>
        <p>
          Embedded providers (such as OAuth sign-in or hosting) may set their own cookies when their content
          loads. See their policies for details.
        </p>

        <h2>Managing cookies</h2>
        <p>
          You can block or delete cookies through your browser settings. Blocking strictly necessary cookies may
          prevent parts of the app from working.
        </p>

        <h2>More information</h2>
        <p>
          See our <Link to="/privacy">Privacy policy</Link> for how we process personal data. Questions:{' '}
          <a href={`mailto:${contact}`}>{contact}</a>.
        </p>
      </>
    </PublicLegalLayout>
  );
}
