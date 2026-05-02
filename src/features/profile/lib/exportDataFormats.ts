import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { ProfileRow } from '@/features/profile/types';
import type { CategoryLists } from '@/features/categories/hooks/useCategories';
import type { MappedTxn } from '@/utils/txnMap';

export type ExportBundle = {
  exportedAt: string;
  profile: ProfileRow | null;
  categories: CategoryLists;
  transactions: MappedTxn[];
};

function categoryLabelMap(lists: CategoryLists): Map<string, string> {
  const m = new Map<string, string>();
  for (const row of lists.expense) m.set(row.id, row.label);
  for (const row of lists.income) m.set(row.id, row.label);
  for (const row of lists.transfer) m.set(row.id, row.label);
  return m;
}

function txnTableRows(bundle: ExportBundle): string[][] {
  const cat = categoryLabelMap(bundle.categories);
  return bundle.transactions.map((t) => [
    t.time || (t.occurred_at ? t.occurred_at.slice(0, 10) : ''),
    t.kind,
    t.title.replace(/\s+/g, ' ').trim() || '—',
    String(t.amount),
    t.cat ? cat.get(t.cat) || t.cat : '—',
    (t.note || '').replace(/\s+/g, ' ').trim() || '—',
  ]);
}

function baseFilename(): string {
  return `truspend-export-${new Date().toISOString().slice(0, 10)}`;
}

export function downloadExportExcel(bundle: ExportBundle): void {
  const wb = XLSX.utils.book_new();
  const txnHead = [['Date', 'Kind', 'Title', 'Amount', 'Category', 'Note']];
  const txnBody = txnTableRows(bundle);
  const txnSheet = XLSX.utils.aoa_to_sheet([...txnHead, ...txnBody]);
  XLSX.utils.book_append_sheet(wb, txnSheet, 'Transactions');

  const catRows: (string | number)[][] = [['Kind', 'Label', 'Id']];
  for (const kind of ['expense', 'income', 'transfer'] as const) {
    for (const row of bundle.categories[kind]) {
      catRows.push([kind, row.label, row.id]);
    }
  }
  const catSheet = XLSX.utils.aoa_to_sheet(catRows);
  XLSX.utils.book_append_sheet(wb, catSheet, 'Categories');

  const meta: (string | undefined)[][] = [
    ['exportedAt', bundle.exportedAt],
    ['email', bundle.profile?.email ?? ''],
    ['full_name', bundle.profile?.full_name ?? ''],
    ['currency', bundle.profile?.currency ?? ''],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(meta), 'Meta');

  XLSX.writeFile(wb, `${baseFilename()}.xlsx`);
}

export function downloadExportPdf(bundle: ExportBundle): void {
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  const margin = 14;
  let y = margin;

  doc.setFontSize(16);
  doc.text('Truspend export', margin, y);
  y += 8;
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 90);
  doc.text(`Exported: ${bundle.exportedAt}`, margin, y);
  y += 5;
  const email = bundle.profile?.email || '—';
  doc.text(`Account: ${email}`, margin, y);
  y += 5;
  doc.text(`Transactions: ${bundle.transactions.length}`, margin, y);
  y += 5;
  doc.setTextColor(0, 0, 0);

  const body = txnTableRows(bundle);
  autoTable(doc, {
    startY: y + 4,
    head: [['Date', 'Kind', 'Title', 'Amount', 'Category', 'Note']],
    body,
    margin: { left: margin, right: margin },
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [15, 15, 18], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 18 },
      2: { cellWidth: 36 },
      3: { cellWidth: 20 },
      4: { cellWidth: 26 },
    },
    didDrawPage: (data) => {
      const page = String(data.pageNumber);
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 130);
      doc.text(
        page,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'center' },
      );
      doc.setTextColor(0, 0, 0);
    },
  });

  doc.save(`${baseFilename()}.pdf`);
}
