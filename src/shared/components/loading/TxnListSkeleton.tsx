import '@/shared/components/loading/app-boot-loading.css';

function SkeletonRow() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '11px 16px',
        borderBottom: '1px solid #F5F5F8',
      }}
    >
      <div className="loading-panel-placeholder" style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="loading-panel-placeholder" style={{ width: '55%', height: 13, borderRadius: 6 }} />
        <div className="loading-panel-placeholder" style={{ width: '30%', height: 10, borderRadius: 6 }} />
      </div>
      <div className="loading-panel-placeholder" style={{ width: 56, height: 13, borderRadius: 6 }} />
    </div>
  );
}

export function TxnListSkeletonGroup() {
  return (
    <div style={{ marginBottom: 8 }}>
      <div className="loading-panel-placeholder" style={{ width: 60, height: 10, borderRadius: 5, margin: '0 20px 8px' }} />
      <div style={{ margin: '0 16px', background: '#fff', borderRadius: 18, overflow: 'hidden' }}>
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    </div>
  );
}
