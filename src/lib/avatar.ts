const MONO_PALETTE = [
  { bg: '#dbeafe', fg: '#3b82f6' },
  { bg: '#ede9fe', fg: '#8b5cf6' },
  { bg: '#dcfce7', fg: '#10b981' },
  { bg: '#fef3c7', fg: '#f59e0b' },
];

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() || '')
    .join('');
}

export function avatarColors(key: number) {
  return MONO_PALETTE[((key % MONO_PALETTE.length) + MONO_PALETTE.length) % MONO_PALETTE.length];
}
