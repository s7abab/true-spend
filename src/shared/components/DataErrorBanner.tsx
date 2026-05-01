type DataErrorBannerProps = {
  message: string | null;
  onRetry?: () => void;
  busy?: boolean;
};

export function DataErrorBanner({ message, onRetry, busy }: DataErrorBannerProps) {
  if (!message) return null;
  return (
    <div
      role="alert"
      style={{
        margin: '10px 16px 0',
        padding: '12px 14px',
        borderRadius: 14,
        background: '#FFF4E6',
        border: '1px solid #F5D0A8',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
      }}
    >
      <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 500, color: '#7A4B00' }}>{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={busy}
          style={{
            padding: '8px 14px',
            borderRadius: 10,
            border: 'none',
            background: '#0F0F12',
            color: '#fff',
            fontWeight: 600,
            fontSize: 13,
            cursor: busy ? 'wait' : 'pointer',
            opacity: busy ? 0.7 : 1,
            fontFamily: 'inherit',
            flexShrink: 0,
          }}
        >
          {busy ? 'Retrying…' : 'Retry'}
        </button>
      )}
    </div>
  );
}
