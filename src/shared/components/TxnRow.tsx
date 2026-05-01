import { CatIcon } from '@/shared/components/Icons';
import { formatMoney } from '@/utils/money';
import type { CategoryRow } from '@/features/categories/types';
import type { TransactionKind } from '@/types/ledger';
import type { MappedTxn } from '@/utils/txnMap';

type ResolveCat = (id: string | null, kind: TransactionKind | string | undefined) => CategoryRow;

export function TxnRow({
  txn,
  resolveCat,
  currency,
  onPress,
}: {
  txn: MappedTxn;
  resolveCat: ResolveCat;
  currency: string;
  onPress?: () => void;
}) {
  const cat = resolveCat(txn.cat, txn.kind);
  const isInc = txn.kind === 'income';
  const amt = formatMoney(txn.amount, currency);
  const body = (
    <>
      <div className="txn-icon" style={{ background: `${cat.tint}18`, color: cat.tint }}>
        <CatIcon cat={cat} size={44} radius={14} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="txn-name"
          style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {txn.title}
        </div>
        <div className="txn-time">{txn.time}</div>
      </div>
      <div className="txn-amount" style={{ color: isInc ? '#22A06B' : '#0F0F12' }}>
        {isInc ? '+' : '−'}
        {amt}
      </div>
    </>
  );
  if (onPress) {
    return (
      <button type="button" className="txn-row txn-row-btn" onClick={onPress} aria-label={`Edit ${txn.title}`}>
        {body}
      </button>
    );
  }
  return <div className="txn-row">{body}</div>;
}
