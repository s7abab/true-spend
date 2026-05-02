import '@/shared/components/loading/app-boot-loading.css';
import { LoadingSpinner } from '@/shared/components/loading/LoadingSpinner';

type AppBootLoadingProps = {
  /** Shown under the spinner; keep short for a11y */
  label?: string;
};

export function AppBootLoading({ label = 'Loading…' }: AppBootLoadingProps) {
  return (
    <div className="app-boot-loading" role="status" aria-busy="true" aria-live="polite">
      <div className="app-boot-loading__inner">
        <LoadingSpinner />
        <span className="app-boot-loading__label">{label}</span>
      </div>
    </div>
  );
}
