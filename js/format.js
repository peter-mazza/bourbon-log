export function clampRating(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  const clamped = Math.min(10, Math.max(0, num));
  return Math.round(clamped * 10) / 10;
}

export function formatRating(value) {
  return value === null || value === undefined ? '—' : Number(value).toFixed(1);
}

export function firstPhotoUrl(photoUrls) {
  return Array.isArray(photoUrls) && photoUrls.length > 0 ? photoUrls[0] : null;
}

export function todayLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}
