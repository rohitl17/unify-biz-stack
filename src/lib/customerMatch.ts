// Cross-module joins are customerName string matches (see docs/DATA_MODEL.md),
// so a casing/punctuation variant of an existing name silently orphans records.
// These helpers detect near-misses at every point where a name is typed in.

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.,]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Returns the existing name this input should probably resolve to:
// 'exact'  — same string, joins will work
// 'near'   — differs only in case/whitespace/trailing punctuation; using the
//            typed variant would silently break cross-module joins
export function findNameMatch(
  input: string,
  existingNames: string[]
): { kind: 'exact' | 'near'; name: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const exact = existingNames.find(n => n === trimmed);
  if (exact) return { kind: 'exact', name: exact };
  const norm = normalizeName(trimmed);
  const near = existingNames.find(n => normalizeName(n) === norm);
  return near ? { kind: 'near', name: near } : null;
}
