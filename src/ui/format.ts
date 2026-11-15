// Compact number formatting for large idle-game values (1.2K, 3.4M, ...).

const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi'];

export function formatNumber(value: number): string {
  if (!isFinite(value)) return '\u221E';
  if (value < 1000) {
    return value >= 100 ? Math.floor(value).toString() : (Math.round(value * 10) / 10).toString();
  }
  let tier = 0;
  let n = value;
  while (n >= 1000 && tier < SUFFIXES.length - 1) {
    n /= 1000;
    tier++;
  }
  const rounded = Math.round(n * 100) / 100;
  return `${rounded}${SUFFIXES[tier]}`;
}

export function formatDuration(seconds: number): string {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}j ${m}m`;
  if (m > 0) return `${m}m ${sec}d`;
  return `${sec}d`;
}
