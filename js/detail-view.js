import { formatRating, clampRating, escapeHtml } from './format.js';

function showFormError(form, err) {
  let errorEl = form.querySelector('.form-error');
  if (!errorEl) {
    errorEl = document.createElement('p');
    errorEl.className = 'form-error';
    form.appendChild(errorEl);
  }
  errorEl.textContent = `Save failed: ${err.message}`;
}

function openLightbox(url) {
  const overlay = document.createElement('div');
  overlay.className = 'photo-lightbox';
  const img = document.createElement('img');
  img.src = url;
  img.alt = '';
  overlay.appendChild(img);
  overlay.addEventListener('click', () => overlay.remove());
  document.body.appendChild(overlay);
}

export function renderDetailView(container, bottle, { onBack, onSave }) {
  renderReadMode();

  function photosHtml() {
    return (bottle.photo_urls ?? [])
      .map(url => `<img src="${escapeHtml(url)}" alt="" />`)
      .join('');
  }

  function renderReadMode() {
    container.innerHTML = `
      <button class="back-btn" id="detail-back">&larr; Back</button>
      <div class="photos">${photosHtml()}</div>
      <dl class="detail-fields">
        <dt>Name</dt><dd>${escapeHtml(bottle.name)}</dd>
        <dt>Distillery</dt><dd>${bottle.distillery ? escapeHtml(bottle.distillery) : '—'}</dd>
        <dt>Proof</dt><dd>${bottle.proof ?? '—'}</dd>
        <dt>Rating</dt><dd>${formatRating(bottle.rating)}</dd>
        <dt>Finished</dt><dd>${bottle.finished_date ?? '—'}</dd>
        <dt>Note</dt><dd>${bottle.note ? escapeHtml(bottle.note) : '—'}</dd>
      </dl>
      <button id="detail-edit">Edit</button>
    `;
    container.querySelector('#detail-back').addEventListener('click', onBack);
    container.querySelector('#detail-edit').addEventListener('click', renderEditMode);
    container.querySelectorAll('.photos img').forEach(img => {
      img.addEventListener('click', () => openLightbox(img.src));
    });
  }

  function editPhotosHtml() {
    return (bottle.photo_urls ?? [])
      .map(url => `
        <div class="photo-item" data-url="${escapeHtml(url)}">
          <img src="${escapeHtml(url)}" alt="" />
          <button type="button" class="photo-remove" aria-label="Remove photo">&times;</button>
        </div>`)
      .join('');
  }

  function renderEditMode() {
    const removedUrls = new Set();

    container.innerHTML = `
      <div class="photos">${editPhotosHtml()}</div>
      <form id="detail-form">
        <label>Add photos <input name="photos" type="file" accept="image/*" multiple /></label>
        <label>Name <input name="name" value="${escapeHtml(bottle.name ?? '')}" required /></label>
        <label>Distillery <input name="distillery" value="${escapeHtml(bottle.distillery ?? '')}" /></label>
        <label>Proof <input name="proof" type="number" step="0.1" value="${bottle.proof ?? ''}" /></label>
        <label>Rating <input name="rating" type="number" min="0" max="10" step="0.1" value="${bottle.rating ?? ''}" /></label>
        <label>Finished <input name="finished_date" type="date" value="${bottle.finished_date ?? ''}" /></label>
        <label>Note <textarea name="note">${escapeHtml(bottle.note ?? '')}</textarea></label>
        <button type="submit">Save</button>
        <button type="button" id="detail-edit-cancel">Cancel</button>
      </form>
    `;
    container.querySelector('#detail-edit-cancel').addEventListener('click', renderReadMode);
    container.querySelectorAll('.photo-item').forEach(item => {
      const removeBtn = item.querySelector('.photo-remove');
      removeBtn.addEventListener('click', () => {
        const url = item.dataset.url;
        const staged = !removedUrls.has(url);
        if (staged) removedUrls.add(url); else removedUrls.delete(url);
        item.classList.toggle('staged-remove', staged);
        removeBtn.innerHTML = staged ? '&#8634;' : '&times;';
        removeBtn.setAttribute('aria-label', staged ? 'Undo remove photo' : 'Remove photo');
      });
    });
    container.querySelector('#detail-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(event.target);
      const fields = {
        name: form.get('name'),
        distillery: form.get('distillery') || null,
        proof: form.get('proof') ? Number(form.get('proof')) : null,
        rating: form.get('rating') ? clampRating(form.get('rating')) : null,
        finished_date: form.get('finished_date') || null,
        note: form.get('note') || null,
      };
      const photoChanges = {
        newFiles: Array.from(container.querySelector('[name="photos"]').files),
        removedUrls: [...removedUrls],
      };
      const submitBtn = event.target.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      try {
        bottle = await onSave(bottle.id, fields, photoChanges);
        renderReadMode();
      } catch (err) {
        submitBtn.disabled = false;
        showFormError(event.target, err);
      }
    });
  }
}
