// Lightweight transient toast notifications.

let wrap: HTMLElement | null = null;

function ensureWrap(): HTMLElement {
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'toast-wrap';
    document.body.appendChild(wrap);
  }
  return wrap;
}

export function toast(message: string, variant: 'info' | 'warn' = 'info'): void {
  const el = document.createElement('div');
  el.className = `toast ${variant === 'warn' ? 'warn' : ''}`;
  el.textContent = message;
  ensureWrap().appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity 0.3s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, 1600);
}
