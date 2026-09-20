import { clampRating, escapeHtml, todayLocal } from './format.js';

function showFormError(form, err) {
  let errorEl = form.querySelector('.form-error');
  if (!errorEl) {
    errorEl = document.createElement('p');
    errorEl.className = 'form-error';
    form.appendChild(errorEl);
  }
  errorEl.textContent = `Save failed: ${err.message}`;
}

export function renderAddView(container, { prefill = {}, onSave, onCancel }) {
  const today = todayLocal();

  container.innerHTML = `
    <form id="add-form">
      <label>Photos <input name="photos" type="file" accept="image/*" capture="environment" multiple /></label>
      <label>Name <input name="name" value="${escapeHtml(prefill.name ?? '')}" required /></label>
      <label>Distillery <input name="distillery" value="${escapeHtml(prefill.distillery ?? '')}" /></label>
      <label>Proof <input name="proof" type="number" step="0.1" value="${prefill.proof ?? ''}" /></label>
      <label>Rating <input name="rating" type="number" min="0" max="10" step="0.1" value="${prefill.rating ?? ''}" /></label>
      <label>Finished <input name="finished_date" type="date" value="${escapeHtml(prefill.finished_date ?? today)}" /></label>
      <label>Note <textarea name="note">${escapeHtml(prefill.note ?? '')}</textarea></label>
      <button type="submit">Save</button>
      <button type="button" id="add-cancel">Cancel</button>
    </form>
  `;

  container.querySelector('#add-cancel').addEventListener('click', onCancel);

  container.querySelector('#add-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.target);
    const photoFiles = Array.from(container.querySelector('[name="photos"]').files);
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
      await onSave(fields, photoFiles);
    } catch (err) {
      submitBtn.disabled = false;
      showFormError(event.target, err);
    }
  });
}
