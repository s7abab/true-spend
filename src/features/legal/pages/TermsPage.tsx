import { Link } from 'react-router-dom';
import { PublicLegalLayout } from '@/features/legal/components/PublicLegalLayout';
import { publicContactEmail } from '@/features/legal/lib/siteMeta';

export function TermsPage() {
  const contact = publicContactEmail();

  return (
    <PublicLegalLayout title="Terms of service" documentTitle="Terms">
      <>
        <p>
          These terms govern your use of Truspend. By creating an account or using the service, you agree to
          them.
        </p>

        <h2>The service</h2>
        <p>
          Truspend provides software for personal money tracking. We may change features, suspend maintenance,
          or discontinue parts of the service with reasonable notice where practicable.
        </p>

        <h2>Not financial, legal, or tax advice</h2>
        <p>
          Truspend is a tool, not a bank, broker, accountant, or advisor. Nothing in the app is professional
          advice. You are solely responsible for financial decisions and compliance with tax and reporting
          rules in your jurisdictions.
        </p>

        <h2>Your account</h2>
        <p>
          You must provide accurate information and keep your sign-in secure. You are responsible for
          activity under your account. We may suspend or terminate accounts that violate these terms or pose
          risk to the service or others.
        </p>

        <h2>Acceptable use</h2>
        <ul>
          <li>No unlawful, fraudulent, or harmful use.</li>
          <li>No attempt to access others&apos; data or break security.</li>
          <li>No overload, scraping, or reverse engineering except where the law allows.</li>
          <li>No use of the service to build a competing product from our proprietary materials.</li>
        </ul>

        <h2>Your content</h2>
        <p>
          You retain rights to data you submit. You grant us a licence to host, process, back up, and display
          that content only to operate the service for you, consistent with our{' '}
          <Link to="/privacy">Privacy policy</Link>.
        </p>

        <h2>Third-party services</h2>
        <p>
          Sign-in and infrastructure may rely on third parties (such as Google or Supabase). Their terms and
          privacy policies also apply to their handling of your information.
        </p>

        <h2>Fees</h2>
        <p>
          Truspend is currently offered at no charge. If we introduce paid plans later, we will tell you in
          advance, update these terms, and only bill you where you agree and the law allows.
        </p>

        <h2>Disclaimers</h2>
        <p>
          The service is provided &quot;as is&quot; to the maximum extent permitted by law. We disclaim implied
          warranties of merchantability, fitness for a particular purpose, and non-infringement.
        </p>

        <h2>Limitation of liability</h2>
        <p>
          To the extent permitted by applicable law, we are not liable for indirect, incidental, special,
          consequential, or punitive damages, or loss of profits, data, or goodwill. Our aggregate liability
          for claims relating to the service is limited to the greater of (a) amounts you paid us in the twelve
          months before the claim or (b) zero if the service is free. Some jurisdictions do not allow certain
          limitations; where that applies, our liability is limited to the fullest extent allowed.
        </p>

        <h2>Indemnity</h2>
        <p>
          To the extent permitted by law, you agree to defend and hold us harmless from claims arising from
          your misuse of the service or breach of these terms.
        </p>

        <h2>Governing law and disputes</h2>
        <p>
          Unless mandatory consumer protection rules where you live say otherwise, these terms are governed by
          the laws of the jurisdiction in which Truspend&apos;s operating company is established, without regard
          to conflict-of-law rules. Courts in that jurisdiction have non-exclusive jurisdiction, except where
          you must bring claims in your home courts under local law.
        </p>

        <h2>Contact</h2>
        <p>
          <a href={`mailto:${contact}`}>{contact}</a>
        </p>
      </>
    </PublicLegalLayout>
  );
}
