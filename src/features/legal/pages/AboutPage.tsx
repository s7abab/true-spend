import { PublicLegalLayout } from '@/features/legal/components/PublicLegalLayout';
import { publicContactEmail, publicSiteOrigin } from '@/features/legal/lib/siteMeta';

export function AboutPage() {
  const contact = publicContactEmail();
  const origin = publicSiteOrigin();

  return (
    <PublicLegalLayout title="About Truspend" documentTitle="About">
      <>
        <h2>What we do</h2>
        <p>
          Truspend is a personal finance tracker: record income and expenses, organize with categories, see
          trends, and stay on top of your money in one place.
        </p>

        <h2>Who we serve</h2>
        <p>
          The product is built for individuals worldwide. Features and availability may vary; you are
          responsible for complying with local laws that apply to you when you use the service.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about the product or these pages:{' '}
          <strong>
            <a href={`mailto:${contact}`}>{contact}</a>
          </strong>
          {origin ? (
            <>
              {' '}
              · Website:{' '}
              <a href={origin} rel="noreferrer">
                {origin}
              </a>
            </>
          ) : null}
        </p>

        <h2>Company details</h2>
        <p>
          Registered legal name, address, and company identifiers will be listed here for transparency where
          required in your region.
        </p>
      </>
    </PublicLegalLayout>
  );
}
