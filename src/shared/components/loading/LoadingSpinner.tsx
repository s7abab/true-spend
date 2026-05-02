import '@/shared/components/loading/app-boot-loading.css';

type LoadingSpinnerProps = {
  size?: 'md' | 'sm';
  className?: string;
};

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const cls = size === 'sm' ? 'loading-spinner loading-spinner--sm' : 'loading-spinner';
  return <span className={`${cls} ${className}`.trim()} aria-hidden />;
}
