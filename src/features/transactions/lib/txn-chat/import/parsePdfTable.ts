import { ImportPasswordError, pdfPasswordReason } from '@/features/transactions/lib/txn-chat/import/importPasswordError';
import type { ParsedImportTable } from '@/features/transactions/lib/txn-chat/import/types';

/** PDF user-space units: insert a tab between runs when the gap exceeds this (visual columns). */
const COLUMN_GAP_MIN = 14;

type TextItem = { str: string; transform: number[]; width?: number };

function pageLinesFromTextContent(items: unknown[]): string[] {
  const parsed: TextItem[] = [];
  for (const it of items) {
    if (!it || typeof it !== 'object') continue;
    const o = it as Record<string, unknown>;
    if (typeof o.str !== 'string' || !o.str.trim()) continue;
    const tr = o.transform;
    if (!Array.isArray(tr) || tr.length < 6) continue;
    const n = tr.map((x) => (typeof x === 'number' ? x : Number(x))).filter((x) => !Number.isNaN(x));
    if (n.length < 6) continue;
    const width = typeof o.width === 'number' && o.width > 0 ? o.width : undefined;
    parsed.push({ str: o.str as string, transform: n as number[], width });
  }
  if (!parsed.length) return [];
  const yTol = 4;
  parsed.sort((a, b) => {
    const dy = b.transform[5] - a.transform[5];
    if (Math.abs(dy) > yTol) return dy > 0 ? 1 : -1;
    return a.transform[4] - b.transform[4];
  });
  const lines: string[] = [];
  let curY: number | null = null;
  let lineItems: TextItem[] = [];
  const flushLine = () => {
    if (!lineItems.length) return;
    let lastEndX = -Infinity;
    const chunks: string[] = [];
    for (const it of lineItems) {
      const x = it.transform[4];
      const scale = Math.abs(it.transform[0]) || 1;
      const approxW =
        typeof it.width === 'number' && it.width > 0
          ? it.width
          : it.str.length * scale * 0.52;
      const gap = x - lastEndX;
      if (lastEndX > -Infinity && gap >= COLUMN_GAP_MIN) {
        chunks.push('\t');
      } else if (lastEndX > -Infinity && gap > 0.2) {
        const prev = chunks[chunks.length - 1];
        if (prev && !/\s$/.test(prev)) chunks.push(' ');
      }
      chunks.push(it.str);
      lastEndX = x + approxW;
    }
    const joined = chunks.join('');
    const line = joined
      .split('\t')
      .map((seg) => seg.replace(/\s+/g, ' ').trim())
      .join('\t')
      .trim();
    if (line) lines.push(line);
  };
  for (const it of parsed) {
    const y = it.transform[5];
    if (curY == null || Math.abs(y - curY) <= yTol) {
      lineItems.push(it);
      curY = curY == null ? y : curY;
    } else {
      flushLine();
      lineItems = [it];
      curY = y;
    }
  }
  flushLine();
  return lines;
}

/** Sentinel for “split on 2+ spaces” (weak fallback). */
const MULTISPACE_SEP = '\u0001';

const PDF_SEPARATORS = ['\t', '|', ';', ',', MULTISPACE_SEP] as const;

function splitByMultiSpace(line: string): string[] {
  return line
    .split(/\s{2,}/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function splitLine(line: string, sep: string): string[] {
  if (sep === MULTISPACE_SEP) return splitByMultiSpace(line);
  if (sep === '\t') return line.split(/\t/).map((s) => s.trim());
  if (sep === '|') return line.split('|').map((s) => s.trim());
  return line.split(sep).map((s) => s.replace(/^"|"$/g, '').trim());
}

function lineHasTwoOrMoreColumns(line: string, sep: string): boolean {
  const cells = splitLine(line, sep);
  if (cells.length < 2) return false;
  return cells.filter((c) => c.trim().length > 0).length >= 2;
}

function countTabularLines(lines: string[], sep: string): number {
  let n = 0;
  for (const line of lines) {
    if (lineHasTwoOrMoreColumns(line, sep)) n++;
  }
  return n;
}

function pickBestSeparator(rawLines: string[]): string | null {
  let bestSep: string | null = null;
  let bestCount = 0;
  for (const sep of PDF_SEPARATORS) {
    const c = countTabularLines(rawLines, sep);
    if (c > bestCount) {
      bestCount = c;
      bestSep = sep;
    }
  }
  return bestCount >= 2 ? bestSep : null;
}

export async function parsePdfBufferToTable(buf: ArrayBuffer, password?: string): Promise<ParsedImportTable> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).href;

  const data = new Uint8Array(buf);
  let doc;
  try {
    doc = await pdfjs
      .getDocument({
        data,
        useSystemFonts: true,
        ...(password ? { password } : {}),
      })
      .promise;
  } catch (e) {
    const pr = pdfPasswordReason(e);
    if (pr) {
      throw new ImportPasswordError(
        pr === 'incorrect'
          ? 'Wrong password. Try again, or unlock the PDF and upload again.'
          : 'This PDF is password-protected. Enter the password below, or unlock the file in your PDF viewer and save a copy without a password.',
        'pdf',
        pr,
      );
    }
    throw e;
  }
  const allLines: string[] = [];
  const maxPages = Math.min(doc.numPages, 15);
  for (let p = 1; p <= maxPages; p++) {
    const page = await doc.getPage(p);
    const text = await page.getTextContent();
    allLines.push(...pageLinesFromTextContent(text.items as unknown[]));
  }
  await doc.destroy();

  const rawLines = allLines.map((l) => l.trim()).filter(Boolean);
  if (rawLines.length < 2) {
    throw new Error(
      'Could not read usable text from this PDF (it may be a scan or image-only). Export CSV or Excel from your bank, or paste rows in chat.',
    );
  }

  const sample = rawLines.slice(0, 200);
  const bestSep = pickBestSeparator(sample);
  if (!bestSep) {
    throw new Error(
      'This PDF does not look like a transaction table (no clear columns in the text). Screenshots, logos, or image-only PDFs will not work. Use your bank’s CSV or Excel export, or a statement PDF that lists rows and columns as text.',
    );
  }

  const tableLines: string[][] = [];
  for (const line of rawLines) {
    if (!lineHasTwoOrMoreColumns(line, bestSep)) continue;
    const cells = splitLine(line, bestSep);
    if (cells.length >= 2) tableLines.push(cells);
  }
  if (tableLines.length < 2) {
    throw new Error(
      'Not enough table-like rows in this PDF. Try CSV or Excel, or a different statement export.',
    );
  }

  const width = Math.max(...tableLines.map((r) => r.length));
  const padRow = (r: string[]) => {
    const o = [...r];
    while (o.length < width) o.push('');
    return o;
  };
  const normalized = tableLines.map(padRow);
  const headers = normalized[0].map((h, i) => (h.trim() ? h.trim() : `Column ${i + 1}`));
  const rows = normalized.slice(1).map((r) => headers.map((_, j) => String(r[j] ?? '').trim()));
  const nonEmpty = rows.filter((r) => r.some((c) => c.length > 0));
  return { headers, rows: nonEmpty };
}
