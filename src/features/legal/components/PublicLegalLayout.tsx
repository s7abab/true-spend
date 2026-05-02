import { useEffect, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/components/AuthContext';
import { IChevLeft } from '@/shared/components/Icons';
import './PublicLegalLayout.css';

type PublicLegalLayoutProps = {
  title: string;
  documentTitle: string;
  children: ReactNode;
};

export function PublicLegalLayout({ title, documentTitle, children }: PublicLegalLayoutProps) {
  const navigate = useNavigate();
  const { session } = useAuth();

  useEffect(() => {
    document.title = `${documentTitle} · Truspend`;
  }, [documentTitle]);

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(session ? '/' : '/');
  };

  return (
    <div className="public-legal">
      <header className="public-legal__header">
        <button type="button" className="public-legal__back" onClick={() => goBack()} aria-label="Go back">
          <IChevLeft size={18} stroke={2} />
          Back
        </button>
        <Link to="/" className="public-legal__brand">
          <img src="/logo.svg" alt="" width={32} height={32} decoding="async" />
          <span>Truspend</span>
        </Link>
      </header>

      <div className="public-legal__scroll">
        <main className="public-legal__main">
          <h1 className="public-legal__title">{title}</h1>
          <div className="public-legal__sheet">
            <div className="public-legal__body">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
