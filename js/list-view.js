import { formatRating, firstPhotoUrl } from './format.js';

export function renderListView(container, bottles, { onSelect }) {
  if (!bottles.length) {
    container.innerHTML = '<p class="empty">No bottles yet. Tap Add to log one.</p>';
    return;
  }

  container.innerHTML = bottles.map(bottle => {
    const thumb = firstPhotoUrl(bottle.photo_urls);
    return `
      <button class="bottle-row" data-id="${bottle.id}">
        ${thumb ? `<img class="thumb" src="${thumb}" alt="" />` : '<span class="thumb thumb-empty"></span>'}
        <span class="bottle-name">${bottle.name}</span>
        <span class="bottle-rating">${formatRating(bottle.rating)}</span>
      </button>
    `;
  }).join('');

  container.querySelectorAll('.bottle-row').forEach(row => {
    row.addEventListener('click', () => onSelect(row.dataset.id));
  });
}
