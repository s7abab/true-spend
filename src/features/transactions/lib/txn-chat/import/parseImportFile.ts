import type { ParsedImportTable } from '@/features/transactions/lib/txn-chat/import/types';
import { parseSpreadsheetBuffer } from '@/features/transactions/lib/txn-chat/import/parseSpreadsheet';
import { parsePdfBufferToTable } from '@/features/transactions/lib/txn-chat/import/parsePdfTable';

const SHEET_EXT = /\.(xlsx|xls|csv)$/i;

export type ParseImportFileOptions = {
  /** For password-protected PDF or Excel. CSV is not encrypted by this path. */
  password?: string;
};

export async function parseImportFile(file: File, opts?: ParseImportFileOptions): Promise<ParsedImportTable> {
  const name = file.name || '';
  const pwd = opts?.password?.trim() || undefined;
  const buf = await file.arrayBuffer();
  if (/\.pdf$/i.test(name)) {
    return parsePdfBufferToTable(buf, pwd);
  }
  if (SHEET_EXT.test(name) || file.type.includes('spreadsheet') || file.type === 'text/csv') {
    return parseSpreadsheetBuffer(buf, pwd);
  }
  // Guess from magic / first bytes: PDF starts with %PDF
  const head = new Uint8Array(buf.slice(0, 5));
  const sig = String.fromCharCode(...head);
  if (sig.startsWith('%PDF')) {
    return parsePdfBufferToTable(buf, pwd);
  }
  return parseSpreadsheetBuffer(buf, pwd);
}
