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
  }

  function renderEditMode() {
    container.innerHTML = `
      <div class="photos">${photosHtml()}</div>
      <form id="detail-form">
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
      const submitBtn = event.target.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      try {
        bottle = await onSave(bottle.id, fields);
        renderReadMode();
      } catch (err) {
        submitBtn.disabled = false;
        showFormError(event.target, err);
      }
    });
  }
}
