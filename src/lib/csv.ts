// Minimal CSV utilities for lead import/export. No external dependencies —
// handles quoted fields, escaped quotes, and CRLF line endings, which covers
// exports from Excel, Google Sheets, and Numbers.

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

export function parseCsv(text: string): ParsedCsv {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field); field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      rows.push(row); row = [];
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }

  const nonEmpty = rows.filter(r => r.some(c => c.trim() !== ''));
  if (nonEmpty.length === 0) return { headers: [], rows: [] };
  return { headers: nonEmpty[0].map(h => h.trim()), rows: nonEmpty.slice(1) };
}

const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'lost'] as const;
const LEAD_STAGES = ['discovery', 'proposal', 'negotiation', 'closed_won', 'closed_lost'] as const;

export interface LeadDraft {
  company: string;
  contactName: string;
  email: string;
  value: number;
  status: typeof LEAD_STATUSES[number];
  stage: typeof LEAD_STAGES[number];
}

export interface RowResult {
  line: number; // 1-based line in the file (header = line 1)
  raw: string[];
  lead?: LeadDraft;
  errors: string[];
}

// Accepts flexible header names: "Company"/"company name", "Contact"/"contact_name", etc.
const HEADER_ALIASES: Record<keyof LeadDraft, string[]> = {
  company: ['company', 'company name', 'account', 'organization'],
  contactName: ['contactname', 'contact name', 'contact', 'name', 'full name'],
  email: ['email', 'email address', 'e-mail'],
  value: ['value', 'deal value', 'amount', 'deal size'],
  status: ['status', 'lead status'],
  stage: ['stage', 'deal stage', 'pipeline stage'],
};

function mapHeaders(headers: string[]): Partial<Record<keyof LeadDraft, number>> {
  const map: Partial<Record<keyof LeadDraft, number>> = {};
  headers.forEach((h, idx) => {
    const norm = h.toLowerCase().replace(/[_-]/g, ' ').trim();
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (map[field as keyof LeadDraft] === undefined && aliases.includes(norm)) {
        map[field as keyof LeadDraft] = idx;
      }
    }
  });
  return map;
}

export function validateLeadRows(parsed: ParsedCsv): { results: RowResult[]; headerError?: string } {
  const map = mapHeaders(parsed.headers);
  const missing = (['company', 'contactName', 'email'] as const).filter(f => map[f] === undefined);
  if (missing.length > 0) {
    return {
      results: [],
      headerError: `Missing required column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}. ` +
        `Expected headers like: company, contactName, email, value, status, stage.`,
    };
  }

  const results: RowResult[] = parsed.rows.map((raw, i) => {
    const get = (f: keyof LeadDraft) => (map[f] !== undefined ? (raw[map[f]!] || '').trim() : '');
    const errors: string[] = [];

    const company = get('company');
    const contactName = get('contactName');
    const email = get('email');
    if (!company) errors.push('company is empty');
    if (!contactName) errors.push('contactName is empty');
    if (!email) errors.push('email is empty');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push(`invalid email "${email}"`);

    const valueRaw = get('value').replace(/[$,\s]/g, '');
    const value = valueRaw === '' ? 0 : Number(valueRaw);
    if (Number.isNaN(value) || value < 0) errors.push(`invalid value "${get('value')}"`);

    const statusRaw = get('status').toLowerCase();
    const status = statusRaw === '' ? 'new' : (statusRaw as LeadDraft['status']);
    if (!LEAD_STATUSES.includes(status)) errors.push(`invalid status "${get('status')}" (allowed: ${LEAD_STATUSES.join(', ')})`);

    const stageRaw = get('stage').toLowerCase().replace(/\s+/g, '_');
    const stage = stageRaw === '' ? 'discovery' : (stageRaw as LeadDraft['stage']);
    if (!LEAD_STAGES.includes(stage)) errors.push(`invalid stage "${get('stage')}" (allowed: ${LEAD_STAGES.join(', ')})`);

    return {
      line: i + 2,
      raw,
      errors,
      lead: errors.length === 0
        ? { company, contactName, email, value: Number.isNaN(value) ? 0 : value, status, stage }
        : undefined,
    };
  });

  return { results };
}

function csvEscape(v: unknown): string {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: (string | number)[][]): string {
  return [headers, ...rows].map(r => r.map(csvEscape).join(',')).join('\r\n');
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
