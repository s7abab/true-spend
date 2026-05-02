import { Link } from 'react-router-dom';
import { PublicLegalLayout } from '@/features/legal/components/PublicLegalLayout';
import { publicContactEmail } from '@/features/legal/lib/siteMeta';

export function PrivacyPage() {
  const contact = publicContactEmail();

  return (
    <PublicLegalLayout title="Privacy policy" documentTitle="Privacy">
      <>
        <p>
          This policy describes how Truspend (&quot;we&quot;, &quot;us&quot;) collects, uses, and shares
          personal information when you use our websites and applications.
        </p>

        <h2>Information we process</h2>
        <ul>
          <li>
            <strong>Account and profile.</strong> When you sign in (for example with Google), we receive
            identifiers and basic profile details from your identity provider and store them with your
            account in our backend.
          </li>
          <li>
            <strong>Financial records you enter.</strong> Transaction amounts, titles, notes, dates,
            categories, and related metadata you save in the app.
          </li>
          <li>
            <strong>Usage and technical data.</strong> Such as device type, app version, approximate region
            from network requests, diagnostics, and security logs needed to run and protect the service.
          </li>
          <li>
            <strong>Optional AI-assisted features.</strong> If you use chat or similar features, prompts and
            related context may be sent to model providers to generate responses. Do not paste secrets or
            data you are not allowed to share.
          </li>
        </ul>

        <h2>Why we use this information</h2>
        <p>
          To provide and improve the service, authenticate users, sync data across devices, prevent abuse,
          comply with law, and communicate with you about the product where permitted.
        </p>

        <h2>Legal bases (EEA/UK)</h2>
        <p>
          Where GDPR/UK GDPR applies, we rely on performance of a contract, legitimate interests (such as
          security and product improvement, balanced against your rights), and consent where required — for
          example for non-essential cookies or marketing where those features exist and consent is required.
        </p>

        <h2>Sharing and subprocessors</h2>
        <p>
          We use service providers for hosting, database, authentication, and—if you use them—AI features.
          For example, we use Supabase for authentication and storage, and model providers when you use
          chat. We do not sell your personal information. We may add analytics in the future; if we do, we
          will update this policy.
        </p>

        <h2>International transfers</h2>
        <p>
          Your data may be stored or processed in countries other than where you live—for example, in the cloud
          region used by our hosting and database providers. Where required by law, we use appropriate
          safeguards such as Standard Contractual Clauses. Contact us if you need the region that applies to
          your account.
        </p>

        <h2>Retention</h2>
        <p>
          We keep account and transaction data while your account is active. After you delete your account or
          ask us to delete data, we remove or anonymize it within a reasonable period, subject to limited
          retention for security logs, backups, and legal requirements.
        </p>

        <h2>Your rights</h2>
        <p>
          Depending on where you live, you may have rights to access, correct, delete, export, or restrict
          processing of your personal data, and to object to certain processing or lodge a complaint with a
          supervisory authority. Contact us to exercise these rights.
        </p>

        <h2>California residents</h2>
        <p>
          If the California Consumer Privacy Act (CCPA) applies to us, California residents may have
          additional rights (such as to know, delete, and correct personal information, and to opt out of
          certain sharing). We do not sell personal information as defined under the CCPA. Contact us at the
          email below to exercise your rights.
        </p>

        <h2>Children</h2>
        <p>The service is not directed at children under the age where parental consent is required by law.</p>

        <h2>Changes</h2>
        <p>We may update this policy from time to time. We will post the new version and update the date.</p>

        <h2>Contact</h2>
        <p>
          Privacy inquiries:{' '}
          <a href={`mailto:${contact}`}>{contact}</a>. For cookie-specific details, see our{' '}
          <Link to="/cookies">Cookie notice</Link>.
        </p>
      </>
    </PublicLegalLayout>
  );
}
