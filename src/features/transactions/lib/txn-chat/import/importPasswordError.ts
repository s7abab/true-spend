/** Thrown when a PDF or spreadsheet needs (or rejected) a password. */
export class ImportPasswordError extends Error {
  readonly kind = 'import_password' as const;
  /** When false, only “save an unlocked copy” applies (no password field). */
  readonly allowPasswordEntry: boolean;

  constructor(
    message: string,
    readonly fileKind: 'pdf' | 'spreadsheet',
    readonly reason: 'required' | 'incorrect' = 'required',
    allowPasswordEntry = true,
  ) {
    super(message);
    this.name = 'ImportPasswordError';
    this.allowPasswordEntry = allowPasswordEntry;
  }
}

export function isImportPasswordError(e: unknown): e is ImportPasswordError {
  return e instanceof ImportPasswordError;
}

/** pdf.js rejects with `name === 'PasswordException'`; codes 1 = need, 2 = wrong. */
export function pdfPasswordReason(e: unknown): 'required' | 'incorrect' | null {
  if (!e || typeof e !== 'object') return null;
  const o = e as { name?: string; code?: number };
  if (o.name !== 'PasswordException') return null;
  if (o.code === 2) return 'incorrect';
  return 'required';
}
