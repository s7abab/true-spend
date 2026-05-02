import * as XLSX from 'xlsx';
import { ImportPasswordError } from '@/features/transactions/lib/txn-chat/import/importPasswordError';
import type { ParsedImportTable } from '@/features/transactions/lib/txn-chat/import/types';

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Approximate Excel serial → UTC YYYY-MM-DD (good enough for imports). */
function excelSerialToYmd(n: number): string | null {
  if (!Number.isFinite(n) || n < 20000 || n > 80000) return null;
  const epoch = Date.UTC(1899, 11, 30);
  const ms = epoch + Math.round(n) * 86400000;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function cellToString(v: unknown): string {
  if (v == null || v === '') return '';
  if (v instanceof Date) {
    return `${v.getFullYear()}-${pad2(v.getMonth() + 1)}-${pad2(v.getDate())}`;
  }
  if (typeof v === 'number') {
    const ymd = excelSerialToYmd(v);
    if (ymd) return ymd;
    return String(v);
  }
  return String(v).trim();
}

function normalizeHeader(h: string, idx: number): string {
  const t = String(h ?? '').trim();
  return t || `Column ${idx + 1}`;
}

export function parseSpreadsheetBuffer(buf: ArrayBuffer, password?: string): ParsedImportTable {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buf, {
      type: 'array',
      cellDates: true,
      ...(password ? { password } : {}),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/password is incorrect/i.test(msg)) {
      throw new ImportPasswordError(
        'Wrong password. Try again, or save an unlocked copy from Excel.',
        'spreadsheet',
        'incorrect',
      );
    }
    if (/password-protected|password protected|encrypt|decrypt|unsupported password|ECMA-376/i.test(msg)) {
      const hard = /unsupported password|ECMA-376/i.test(msg);
      throw new ImportPasswordError(
        hard
          ? 'This workbook uses encryption we cannot open in the browser. Save a copy in Excel without a password (File → Info → Protect Workbook), then import again.'
          : 'This spreadsheet is password-protected. Enter the password below, or in Excel use File → Info → Protect Workbook → Encrypt with Password (clear it) and save a copy.',
        'spreadsheet',
        'required',
        !hard,
      );
    }
    if (password) {
      throw new ImportPasswordError(
        'Could not open the file with that password. Try again, or save an unlocked copy.',
        'spreadsheet',
        'incorrect',
      );
    }
    throw e;
  }
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error('No sheet found in workbook.');
  const ws = wb.Sheets[sheetName];
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    defval: '',
    blankrows: false,
  }) as unknown[][];
  if (!aoa.length) throw new Error('Sheet is empty.');
  const rawHeader = aoa[0] as unknown[];
  const headers = rawHeader.map((c, i) => normalizeHeader(cellToString(c), i));
  const rows: string[][] = [];
  for (let r = 1; r < aoa.length; r++) {
    const line = aoa[r] as unknown[];
    const cells = headers.map((_, j) => cellToString(line[j]));
    if (cells.some((c) => c.length > 0)) rows.push(cells);
  }
  return { headers, rows };
}
