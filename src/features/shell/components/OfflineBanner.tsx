import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';

export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div
      role="status"
      className="offline-banner"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        pointerEvents: 'none',
        padding: 'max(8px, env(safe-area-inset-top, 0px)) 16px 10px',
        background: 'linear-gradient(180deg, rgba(61, 31, 36, 0.96), rgba(45, 22, 26, 0.92))',
        color: '#ffe8ec',
        fontSize: 13,
        fontWeight: 600,
        textAlign: 'center',
        width: '100%',
      }}
    >
      You are offline — reconnect to sync data.
    </div>
  );
}
