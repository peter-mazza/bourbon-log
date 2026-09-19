# Bourbon Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal, mobile-friendly bourbon-tasting log: a static web app where Peter can list finished bottles, view a bottle's photos/rating/note, add new bottles (with one or more photos), edit any bottle later, and bulk-import his existing Apple Notes backlog.

**Architecture:** A single static site (HTML/CSS/vanilla-JS ES modules, no framework, no build step) hosted on GitHub Pages, talking directly to Supabase (Postgres + Storage) from the browser via the `supabase-js` CDN client. A separate one-time local JXA script exports the "Bourbon Notes" Apple Notes folder to JSON for pre-filling imports; it is not part of the deployed site.

**Tech Stack:** Vanilla HTML/CSS/JS (ES modules, `type="module"`), `@supabase/supabase-js` v2 (UMD build via jsDelivr CDN), Supabase (Postgres + Storage), GitHub Pages, JavaScript for Automation (JXA) for the Notes export tool.

**Spec:** `docs/superpowers/specs/2026-09-19-bourbon-log-design.md`

## Global Constraints

- Supabase Project URL: `https://xhheuymibmnjenodxigw.supabase.co`
- Supabase publishable key: `sb_publishable_RkpNYWH394ZmmmPNzs_OiQ_7DhjqUDC` (safe to commit — this key is designed for client-side embedding)
- `bottles` table columns: `id`, `name` (required), `distillery`, `proof`, `rating` (0.0–10.0, one decimal), `note`, `photo_urls` (`text[]`, unbounded), `finished_date`, `created_at`
- Storage bucket `bottle-photos` is public; Row Level Security on `bottles` is disabled (documented trade-off in the spec — no auth, single user, low-sensitivity data)
- No automated test suite (explicit spec non-goal) — every task's verification step is manual, in a real browser, against the real Supabase project
- GitHub repo is public (`bourbon-log`), needed for free-tier GitHub Pages
- Apple Notes export only scans the "Bourbon Notes" folder, never the whole Notes library
- The `supabase-js` CDN script tag is pinned to an exact version (`2.116.0`) with a Subresource Integrity hash — if the version is ever bumped, recompute the hash (`curl` the new versioned URL, `openssl dgst -sha384 -binary | openssl base64 -A`) rather than dropping `integrity`

---

## File Structure

```
BourbonLog/
├── index.html              # page shell, view containers, nav
├── style.css                # all styling
├── js/
│   ├── config.js            # Supabase URL + key constants
│   ├── data.js               # Supabase client + fetch/insert/update/uploadPhotos
│   ├── format.js             # pure helpers: clampRating, formatRating, firstPhotoUrl
│   ├── list-view.js          # renders the bottle list
│   ├── detail-view.js        # renders read + edit mode for one bottle
│   ├── add-view.js           # renders the add/import-prefill form
│   ├── import-queue.js       # steps through imported note entries one at a time
│   └── app.js                # bootstraps, routes between views, wires callbacks
├── tools/
│   └── export-notes.js       # one-time local JXA script (not deployed)
└── .gitignore
```

---

### Task 1: Static shell, config, and local dev setup

**Files:**
- Create: `index.html`
- Create: `style.css`
- Create: `js/config.js`
- Create: `.gitignore`

**Interfaces:**
- Produces: `SUPABASE_URL`, `SUPABASE_ANON_KEY` constants exported from `js/config.js`, consumed by `js/data.js` (Task 2).
- Produces: DOM containers `#list-view`, `#detail-view`, `#add-view` and nav buttons `#nav-list`, `#nav-add`, consumed by `js/app.js` (Task 7).

- [ ] **Step 1: Create `index.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>Bourbon Log</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <header class="topbar">
    <h1>Bourbon Log</h1>
    <nav>
      <button id="nav-list" class="nav-btn active">List</button>
      <button id="nav-add" class="nav-btn">Add</button>
    </nav>
  </header>

  <main>
    <section id="list-view"></section>
    <section id="detail-view" hidden></section>
    <section id="add-view" hidden></section>
  </main>

  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/dist/umd/supabase.js"
    integrity="sha384-iLddHTLokph6Omwoyid4XKxHaWa6w41BnoEj0q5oOrzmYPpHIKt1wyjReA7s//pP"
    crossorigin="anonymous"></script>
  <script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `style.css`**

```css
:root {
  color-scheme: light;
  --bg: #faf7f2;
  --ink: #2a1f18;
  --accent: #8a4b2f;
  --border: #ddd2c4;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 16px;
}

.topbar {
  position: sticky;
  top: 0;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.topbar h1 { font-size: 18px; margin: 0; }

.nav-btn {
  border: 1px solid var(--border);
  background: white;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 14px;
  margin-left: 8px;
}

.nav-btn.active {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
}

main { padding: 16px; max-width: 640px; margin: 0 auto; }

.empty { text-align: center; color: #8a8074; margin-top: 40px; }

button, input, textarea {
  font: inherit;
}
```

- [ ] **Step 3: Create `js/config.js`**

```js
export const SUPABASE_URL = "https://xhheuymibmnjenodxigw.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_RkpNYWH394ZmmmPNzs_OiQ_7DhjqUDC";
```

- [ ] **Step 4: Create `.gitignore`**

```
.DS_Store
tools/notes-export.json
```

- [ ] **Step 5: Verify locally**

Run: `cd ~/Claude/BourbonLog && python3 -m http.server 8000`
Open `http://localhost:8000` in a browser.
Expected: page loads, title "Bourbon Log", header with List/Add buttons, no console errors (check DevTools console — a benign warning about `supabase` global loading is fine, but no red errors).

Leave the server running for the rest of this plan's manual verification steps.

- [ ] **Step 6: Commit**

```bash
cd ~/Claude/BourbonLog
git add index.html style.css js/config.js .gitignore
git commit -m "Add static shell, base styles, and Supabase config"
```

---

### Task 2: Supabase data layer

**Files:**
- Create: `js/data.js`

**Interfaces:**
- Consumes: `SUPABASE_URL`, `SUPABASE_ANON_KEY` from `js/config.js` (Task 1); global `window.supabase.createClient` from the CDN script.
- Produces: `fetchBottles()`, `uploadPhotos(files)`, `insertBottle(fields)`, `updateBottle(id, fields)` — all async, all consumed by `js/app.js` (Task 7) and `js/detail-view.js`/`js/add-view.js` (Tasks 5–6) via callbacks passed from `app.js`.

- [ ] **Step 1: Create `js/data.js`**

```js
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function fetchBottles() {
  const { data, error } = await client
    .from('bottles')
    .select('*')
    .order('finished_date', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return data;
}

export async function uploadPhotos(files) {
  const urls = [];
  for (const file of files) {
    const path = `${crypto.randomUUID()}-${file.name}`;
    const { error } = await client.storage.from('bottle-photos').upload(path, file);
    if (error) throw error;
    const { data } = client.storage.from('bottle-photos').getPublicUrl(path);
    urls.push(data.publicUrl);
  }
  return urls;
}

export async function insertBottle(fields) {
  const { data, error } = await client.from('bottles').insert(fields).select().single();
  if (error) throw error;
  return data;
}

export async function updateBottle(id, fields) {
  const { data, error } = await client.from('bottles').update(fields).eq('id', id).select().single();
  if (error) throw error;
  return data;
}
```

- [ ] **Step 2: Verify against the real Supabase project**

With the local server from Task 1 still running, open `http://localhost:8000` and open the DevTools console. Run:

```js
const data = await import('./js/data.js');
await data.fetchBottles();
```

Expected: returns `[]` (empty array, no error) since the table has no rows yet.

Then manually insert a test row via the Supabase Table Editor (any name, e.g. "Test Bottle"), and re-run `await data.fetchBottles()` in the console — expected: an array with one object containing `name: "Test Bottle"`. Delete the test row from the Table Editor afterward so it doesn't show up later in the app.

- [ ] **Step 3: Commit**

```bash
cd ~/Claude/BourbonLog
git add js/data.js
git commit -m "Add Supabase data layer"
```

---

### Task 3: Pure formatting helpers

**Files:**
- Create: `js/format.js`

**Interfaces:**
- Produces: `clampRating(value)` (returns a number rounded to 1 decimal and clamped to 0–10, or `null` for invalid input), `formatRating(value)` (returns a 1-decimal string or `"—"` for `null`/`undefined`), `firstPhotoUrl(photoUrls)` (returns the first URL in an array or `null`). Consumed by `js/list-view.js` (Task 4), `js/detail-view.js` (Task 5), `js/add-view.js` (Task 6).

- [ ] **Step 1: Create `js/format.js`**

```js
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
```

- [ ] **Step 2: Verify in the browser console**

With the local server running, open the console and run:

```js
const fmt = await import('./js/format.js');
fmt.clampRating("15");        // expect 10
fmt.clampRating("7.567");     // expect 7.6
fmt.clampRating("abc");       // expect null
fmt.formatRating(null);       // expect "—"
fmt.formatRating(9.8);        // expect "9.8"
fmt.firstPhotoUrl([]);        // expect null
fmt.firstPhotoUrl(["a", "b"]); // expect "a"
```

Expected: each call's output matches the comment.

- [ ] **Step 3: Commit**

```bash
cd ~/Claude/BourbonLog
git add js/format.js
git commit -m "Add pure rating/photo formatting helpers"
```

---

### Task 4: List view

**Files:**
- Create: `js/list-view.js`
- Modify: `style.css` (append list-specific rules)

**Interfaces:**
- Consumes: `formatRating`, `firstPhotoUrl` from `js/format.js` (Task 3).
- Produces: `renderListView(container, bottles, { onSelect })` where `onSelect(id)` is called with a bottle's `id` when its row is tapped. Consumed by `js/app.js` (Task 7).

- [ ] **Step 1: Create `js/list-view.js`**

```js
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
```

- [ ] **Step 2: Append list styles to `style.css`**

```css
.bottle-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px;
  margin-bottom: 8px;
  background: white;
  border: 1px solid var(--border);
  border-radius: 10px;
  text-align: left;
}

.thumb {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}

.thumb-empty { background: var(--border); }

.bottle-name { flex: 1; font-weight: 600; }

.bottle-rating { color: var(--accent); font-weight: 700; }
```

- [ ] **Step 3: Verify in the browser console**

With the local server running, open the console and run:

```js
const { renderListView } = await import('./js/list-view.js');
const el = document.getElementById('list-view');
let selected = null;
renderListView(el, [
  { id: 'a1', name: 'Test A', rating: 8.5, photo_urls: [] },
  { id: 'b2', name: 'Test B', rating: null, photo_urls: [] },
], { onSelect: (id) => { selected = id; } });
```

Expected: two rows appear under the List view in the page ("Test A" with "8.5", "Test B" with "—"). Click "Test B" in the page and re-check `selected` in the console — expected: `"b2"`.

Reload the page afterward to clear this test state.

- [ ] **Step 4: Commit**

```bash
cd ~/Claude/BourbonLog
git add js/list-view.js style.css
git commit -m "Add list view rendering"
```

---

### Task 5: Detail / edit view

**Files:**
- Create: `js/detail-view.js`
- Modify: `style.css` (append detail-specific rules)

**Interfaces:**
- Consumes: `formatRating`, `clampRating` from `js/format.js` (Task 3).
- Produces: `renderDetailView(container, bottle, { onBack, onSave })` where `onBack()` is called on the back button, and `onSave(id, fields)` is an async function returning the updated bottle row (fields: `name`, `distillery`, `proof`, `rating`, `finished_date`, `note`). Consumed by `js/app.js` (Task 7).

- [ ] **Step 1: Create `js/detail-view.js`**

```js
import { formatRating, clampRating } from './format.js';

export function renderDetailView(container, bottle, { onBack, onSave }) {
  renderReadMode();

  function photosHtml() {
    return (bottle.photo_urls ?? [])
      .map(url => `<img src="${url}" alt="" />`)
      .join('');
  }

  function renderReadMode() {
    container.innerHTML = `
      <button class="back-btn" id="detail-back">&larr; Back</button>
      <div class="photos">${photosHtml()}</div>
      <dl class="detail-fields">
        <dt>Name</dt><dd>${bottle.name}</dd>
        <dt>Distillery</dt><dd>${bottle.distillery ?? '—'}</dd>
        <dt>Proof</dt><dd>${bottle.proof ?? '—'}</dd>
        <dt>Rating</dt><dd>${formatRating(bottle.rating)}</dd>
        <dt>Finished</dt><dd>${bottle.finished_date ?? '—'}</dd>
        <dt>Note</dt><dd>${bottle.note ?? '—'}</dd>
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
        <label>Name <input name="name" value="${bottle.name ?? ''}" required /></label>
        <label>Distillery <input name="distillery" value="${bottle.distillery ?? ''}" /></label>
        <label>Proof <input name="proof" type="number" step="0.1" value="${bottle.proof ?? ''}" /></label>
        <label>Rating <input name="rating" type="number" min="0" max="10" step="0.1" value="${bottle.rating ?? ''}" /></label>
        <label>Finished <input name="finished_date" type="date" value="${bottle.finished_date ?? ''}" /></label>
        <label>Note <textarea name="note">${bottle.note ?? ''}</textarea></label>
        <button type="submit">Save</button>
      </form>
    `;
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
      bottle = await onSave(bottle.id, fields);
      renderReadMode();
    });
  }
}
```

- [ ] **Step 2: Append detail styles to `style.css`**

```css
.back-btn {
  border: none;
  background: none;
  color: var(--accent);
  font-size: 15px;
  padding: 4px 0;
  margin-bottom: 12px;
}

.photos {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  margin-bottom: 16px;
}

.photos img {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border-radius: 8px;
  flex-shrink: 0;
}

.detail-fields { margin-bottom: 16px; }
.detail-fields dt { font-size: 12px; color: #8a8074; margin-top: 10px; }
.detail-fields dd { margin: 2px 0 0; font-size: 16px; }

#detail-form label, #add-form label {
  display: block;
  margin-bottom: 12px;
  font-size: 13px;
  color: #6b6255;
}

#detail-form input, #detail-form textarea,
#add-form input, #add-form textarea {
  display: block;
  width: 100%;
  margin-top: 4px;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
}

#detail-form button, #add-form button {
  padding: 10px 18px;
  border-radius: 8px;
  border: 1px solid var(--accent);
  background: var(--accent);
  color: white;
  margin-top: 8px;
  margin-right: 8px;
}

#add-form button#add-cancel {
  background: white;
  color: var(--accent);
}
```

- [ ] **Step 3: Verify in the browser console**

With the local server running, open the console and run:

```js
const { renderDetailView } = await import('./js/detail-view.js');
const el = document.getElementById('detail-view');
el.hidden = false;
let saved = null;
renderDetailView(el, { id: 'a1', name: 'Test A', distillery: null, proof: null, rating: 8.5, finished_date: '2026-01-01', note: 'Nice', photo_urls: [] }, {
  onBack: () => console.log('back clicked'),
  onSave: async (id, fields) => { saved = { id, fields }; return { id, ...fields, photo_urls: [] }; },
});
```

Expected: read-mode view appears in the page showing "Test A", rating "8.5", note "Nice". Click "Edit" — expected: a form appears prefilled with those values. Change the Distillery field to "Test Distillery" and click Save — expected: view returns to read mode showing "Test Distillery", and in the console `saved.fields.distillery` is `"Test Distillery"`.

Reload the page afterward to clear this test state.

- [ ] **Step 4: Commit**

```bash
cd ~/Claude/BourbonLog
git add js/detail-view.js style.css
git commit -m "Add detail/edit view"
```

---

### Task 6: Add view

**Files:**
- Create: `js/add-view.js`

**Interfaces:**
- Consumes: `clampRating` from `js/format.js` (Task 3).
- Produces: `renderAddView(container, { prefill, onSave, onCancel })` where `prefill` is an optional partial-fields object, `onSave(fields, photoFiles)` is an async function (`photoFiles` is an array of `File`), and `onCancel()` is called on Cancel. Consumed by `js/app.js` (Task 7) and, later, the import flow (Task 10).

- [ ] **Step 1: Create `js/add-view.js`**

```js
import { clampRating } from './format.js';

export function renderAddView(container, { prefill = {}, onSave, onCancel }) {
  const today = new Date().toISOString().slice(0, 10);

  container.innerHTML = `
    <form id="add-form">
      <label>Photos <input name="photos" type="file" accept="image/*" capture="environment" multiple /></label>
      <label>Name <input name="name" value="${prefill.name ?? ''}" required /></label>
      <label>Distillery <input name="distillery" value="${prefill.distillery ?? ''}" /></label>
      <label>Proof <input name="proof" type="number" step="0.1" value="${prefill.proof ?? ''}" /></label>
      <label>Rating <input name="rating" type="number" min="0" max="10" step="0.1" value="${prefill.rating ?? ''}" /></label>
      <label>Finished <input name="finished_date" type="date" value="${prefill.finished_date ?? today}" /></label>
      <label>Note <textarea name="note">${prefill.note ?? ''}</textarea></label>
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
    await onSave(fields, photoFiles);
  });
}
```

- [ ] **Step 2: Verify in the browser console**

With the local server running, open the console and run:

```js
const { renderAddView } = await import('./js/add-view.js');
const el = document.getElementById('add-view');
el.hidden = false;
let result = null;
renderAddView(el, {
  prefill: { note: 'Pre-filled note text', finished_date: '2026-02-01' },
  onSave: async (fields, photoFiles) => { result = { fields, photoFiles }; },
  onCancel: () => console.log('cancelled'),
});
```

Expected: a form appears with Note pre-filled as "Pre-filled note text" and Finished date "2026-02-01". Fill in a Name (e.g. "Console Test"), leave photos empty, click Save. Expected: in the console, `result.fields.name` is `"Console Test"` and `result.fields.finished_date` is `"2026-02-01"`.

Reload the page afterward to clear this test state.

- [ ] **Step 3: Commit**

```bash
cd ~/Claude/BourbonLog
git add js/add-view.js
git commit -m "Add add-bottle view"
```

---

### Task 7: App wiring (routing + bootstrap)

**Files:**
- Create: `js/app.js`

**Interfaces:**
- Consumes: `fetchBottles`, `uploadPhotos`, `insertBottle`, `updateBottle` from `js/data.js` (Task 2); `renderListView` from `js/list-view.js` (Task 4); `renderDetailView` from `js/detail-view.js` (Task 5); `renderAddView` from `js/add-view.js` (Task 6); DOM elements from `index.html` (Task 1).
- Produces: `showView(name)`, `loadList()`, `openDetail(id)`, `openAdd(prefill)` — module-level functions, not exported (this is the app's entry point; Task 10 will modify this file directly to add import wiring).

- [ ] **Step 1: Create `js/app.js`**

```js
import { fetchBottles, uploadPhotos, insertBottle, updateBottle } from './data.js';
import { renderListView } from './list-view.js';
import { renderDetailView } from './detail-view.js';
import { renderAddView } from './add-view.js';

const listView = document.getElementById('list-view');
const detailView = document.getElementById('detail-view');
const addView = document.getElementById('add-view');
const navButtons = {
  list: document.getElementById('nav-list'),
  add: document.getElementById('nav-add'),
};

let bottles = [];

function showView(name) {
  listView.hidden = name !== 'list';
  detailView.hidden = name !== 'detail';
  addView.hidden = name !== 'add';
  navButtons.list.classList.toggle('active', name === 'list');
  navButtons.add.classList.toggle('active', name === 'add');
}

async function loadList() {
  bottles = await fetchBottles();
  renderListView(listView, bottles, { onSelect: openDetail });
  showView('list');
}

function openDetail(id) {
  const bottle = bottles.find(b => b.id === id);
  renderDetailView(detailView, bottle, {
    onBack: () => showView('list'),
    onSave: async (bottleId, fields) => await updateBottle(bottleId, fields),
  });
  showView('detail');
}

function openAdd(prefill) {
  renderAddView(addView, {
    prefill,
    onCancel: () => showView('list'),
    onSave: async (fields, photoFiles) => {
      const photo_urls = photoFiles.length ? await uploadPhotos(photoFiles) : [];
      await insertBottle({ ...fields, photo_urls });
      await loadList();
    },
  });
  showView('add');
}

navButtons.list.addEventListener('click', loadList);
navButtons.add.addEventListener('click', () => openAdd());

loadList();
```

- [ ] **Step 2: Verify end-to-end in the browser**

Reload `http://localhost:8000` (fresh, not the console-injected state from earlier tasks). Expected: List view loads showing "No bottles yet" (assuming the Task 2 test row was deleted).

Click **Add**, fill in Name "Buffalo Trace", Rating "8.5", pick 2 photos from your Mac's file picker, click **Save**. Expected: you're returned to the List view and "Buffalo Trace" now appears with rating "8.5" and a thumbnail.

Click that row. Expected: Detail view opens showing both photos and all fields. Click **Edit**, change Distillery to "Buffalo Trace Distillery", click **Save**. Expected: view returns to read mode showing the new distillery value.

Reload the page entirely. Expected: "Buffalo Trace" with the distillery you set is still there (confirms it persisted in Supabase, not just in-memory).

Delete this test row from the Supabase Table Editor afterward (and its two files from the `bottle-photos` Storage bucket) so it doesn't linger as a fake entry.

- [ ] **Step 3: Commit**

```bash
cd ~/Claude/BourbonLog
git add js/app.js
git commit -m "Wire up app routing and bootstrap"
```

---

### Task 8: Deploy to GitHub Pages

**Files:** none (infrastructure step)

- [ ] **Step 1: Confirm `gh` is authenticated**

Run: `gh auth status`
Expected: shows you're logged in. If not, run `gh auth login` first and follow the prompts.

- [ ] **Step 2: Create the GitHub repo and push**

```bash
cd ~/Claude/BourbonLog
gh repo create bourbon-log --public --source=. --remote=origin --push
```

Expected: output confirms a new public repo `bourbon-log` was created and the current branch pushed to it.

- [ ] **Step 3: Enable GitHub Pages**

```bash
cd ~/Claude/BourbonLog
echo '{"source":{"branch":"main","path":"/"}}' | gh api --method POST repos/{owner}/{repo}/pages --input -
```

Expected: JSON response describing the new Pages site, including an `html_url` field like `https://<username>.github.io/bourbon-log/`.

- [ ] **Step 4: Verify the live site**

Wait about a minute for the first Pages build, then run:

```bash
gh api repos/{owner}/{repo}/pages --jq .html_url
```

Open that URL on your iPhone (or desktop browser). Expected: the same List/Add flow from Task 7's verification works against the real deployed site — add a bottle with a photo taken live from your phone camera (the file input's `capture="environment"` should open the camera directly), confirm it appears in the list, then delete that test row/photo from Supabase afterward.

On iPhone Safari, tap the Share icon → "Add to Home Screen" so the app is one tap away going forward.

- [ ] **Step 5: Commit** (only if any files changed during this task — typically none do)

No commit expected for this task; it's a deploy/infrastructure step.

---

### Task 9: Apple Notes export tool

**Files:**
- Create: `tools/export-notes.js`

- [ ] **Step 1: Create `tools/export-notes.js`**

```js
// Run this locally (not part of the deployed app) to dump the raw text
// and creation date of every note in the "Bourbon Notes" Apple Notes
// folder to JSON, so the Bourbon Log app's Add view can pre-fill a
// draft instead of retyping each note by hand.
//
// Photos are NOT exported here — Notes attachments aren't reliably
// scriptable, so photos are attached by hand per bottle in the app.
//
// Usage:
//   osascript -l JavaScript tools/export-notes.js > tools/notes-export.json
//
// The first run will prompt for permission for your terminal app to
// control Notes — approve it.

function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(div|p)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const Notes = Application("Notes");
Notes.includeStandardAdditions = true;
Notes.launch();

const accounts = Notes.accounts();
let targetFolder = null;
for (const account of accounts) {
  const matches = account.folders.whose({ name: "Bourbon Notes" })();
  if (matches.length > 0) {
    targetFolder = matches[0];
    break;
  }
}

if (!targetFolder) {
  throw new Error('Could not find a folder named "Bourbon Notes" in any Notes account.');
}

const notes = targetFolder.notes();
const entries = notes.map((note) => ({
  text: stripHtml(note.body()),
  date: toISODate(note.creationDate()),
}));

JSON.stringify(entries, null, 2);
```

- [ ] **Step 2: Run it and verify**

```bash
cd ~/Claude/BourbonLog
osascript -l JavaScript tools/export-notes.js > tools/notes-export.json
```

Approve the permission prompt if macOS shows one (first run only). Then:

```bash
cat tools/notes-export.json
```

Expected: a JSON array with one object per note in your "Bourbon Notes" folder, each with a `text` field (plain text, no HTML tags) and a `date` field (`YYYY-MM-DD`). Spot-check the count matches how many notes you expect, and that the text of a couple of entries matches what you remember writing.

`tools/notes-export.json` is gitignored (added in Task 1), so this personal export never gets committed.

- [ ] **Step 3: Commit**

```bash
cd ~/Claude/BourbonLog
git add tools/export-notes.js
git commit -m "Add Apple Notes export tool for backlog import"
```

---

### Task 10: Import queue wiring

**Files:**
- Create: `js/import-queue.js`
- Modify: `index.html` (add Import nav button + hidden file input)
- Modify: `js/app.js` (wire the import flow)

**Interfaces:**
- Consumes: `renderAddView` from `js/add-view.js` (Task 6); `uploadPhotos`, `insertBottle` from `js/data.js` (Task 2).
- Produces: `createImportQueue(entries)` returning `{ current(), remaining(), advance() }`, used only within `js/app.js`.

- [ ] **Step 1: Create `js/import-queue.js`**

```js
export function createImportQueue(entries) {
  let index = 0;
  return {
    current: () => (index < entries.length ? entries[index] : null),
    remaining: () => entries.length - index,
    advance: () => { index += 1; },
  };
}
```

- [ ] **Step 2: Modify `index.html`** — add an Import nav button and a hidden file input, inside `<nav>` after the existing buttons and inside `<body>` respectively:

```html
      <button id="nav-import" class="nav-btn">Import</button>
```
(add this line inside `<nav>`, immediately after the `#nav-add` button)

```html
  <input type="file" id="import-file-input" accept="application/json" hidden />
```
(add this line inside `<body>`, immediately before the `<script>` tags)

- [ ] **Step 3: Modify `js/app.js`** — add the import wiring. Add this import at the top alongside the existing ones:

```js
import { createImportQueue } from './import-queue.js';
```

Add this near the other `navButtons` entries (inside the existing `navButtons` object, add a new line):

```js
  import: document.getElementById('nav-import'),
```

Add this after the existing `const importFileInput = ...` line you're about to add, and the `stepImportQueue` function, right before the final `navButtons.list.addEventListener(...)` / `navButtons.add.addEventListener(...)` / `loadList();` lines at the bottom of the file:

```js
const importFileInput = document.getElementById('import-file-input');

function stepImportQueue(queue) {
  const entry = queue.current();
  if (!entry) {
    loadList();
    return;
  }
  renderAddView(addView, {
    prefill: { note: entry.text, finished_date: entry.date },
    onCancel: () => { queue.advance(); stepImportQueue(queue); },
    onSave: async (fields, photoFiles) => {
      const photo_urls = photoFiles.length ? await uploadPhotos(photoFiles) : [];
      await insertBottle({ ...fields, photo_urls });
      queue.advance();
      stepImportQueue(queue);
    },
  });
  showView('add');
}

navButtons.import.addEventListener('click', () => importFileInput.click());

importFileInput.addEventListener('change', async () => {
  const file = importFileInput.files[0];
  if (!file) return;
  const text = await file.text();
  const entries = JSON.parse(text);
  importFileInput.value = '';
  stepImportQueue(createImportQueue(entries));
});
```

The full bottom of `js/app.js` should now read, in order: the `stepImportQueue` function, then the `navButtons.import` listener, then the `importFileInput` listener, then the pre-existing `navButtons.list.addEventListener(...)`, `navButtons.add.addEventListener(...)`, and `loadList();` lines.

- [ ] **Step 4: Verify end-to-end in the browser**

With the local server running (`python3 -m http.server 8000` in the project root if not already running), reload the page. Expected: an "Import" button now appears in the nav.

Click **Import**. Expected: your OS file picker opens. Select `tools/notes-export.json` from Task 9. Expected: the Add view opens with the Note field pre-filled from the first entry in that file, and the Finished date set to that entry's date.

Fill in a Name, attach a photo, click **Save**. Expected: the app moves on to the next entry's pre-filled Add form automatically (not back to the list). Click **Cancel** on one entry partway through. Expected: it also advances to the next entry (skipping the one you cancelled) rather than saving it.

Keep going (or cancel through the remaining entries quickly for test purposes) until the queue is exhausted. Expected: after the last entry, you land back on the List view showing every bottle you saved during this run.

Delete any test rows/photos you don't want to keep from the Supabase Table Editor and Storage bucket afterward.

- [ ] **Step 5: Commit**

```bash
cd ~/Claude/BourbonLog
git add js/import-queue.js index.html js/app.js
git commit -m "Add Apple Notes import queue flow"
```

- [ ] **Step 6: Push and redeploy**

```bash
cd ~/Claude/BourbonLog
git push
```

GitHub Pages redeploys automatically from the `main` branch on push. Wait about a minute, then reload your deployed URL (from Task 8) and confirm the Import button is live there too.

---

## Self-Review Notes

- **Spec coverage:** list view ✅ (Task 4), detail view with photo display ✅ (Task 5), add with rating/note/photo ✅ (Task 6), multi-photo unbounded array ✅ (Task 2/6, `photo_urls text[]`), edit for backfilling distillery/proof ✅ (Task 5), bulk import from Apple Notes ✅ (Tasks 9–10), GitHub Pages deploy reachable from phone ✅ (Task 8), public-repo trade-off ✅ (confirmed with Peter), RLS-disabled trade-off ✅ (documented in spec and Global Constraints), no automated test suite ✅ (every task uses manual browser verification instead).
- **Placeholder scan:** none found — every step has real, complete code or exact commands.
- **Type/interface consistency:** `renderAddView`'s `prefill` shape (`name`, `distillery`, `proof`, `rating`, `finished_date`, `note`) matches what Task 10's `stepImportQueue` passes (`note`, `finished_date` only — the rest are correctly left for the user to fill in per-bottle). `onSave` signatures match between each view's producer (Tasks 4–6) and consumer (Task 7, Task 10). `clampRating`/`formatRating`/`firstPhotoUrl` names and call signatures match between Task 3's definition and every later consumer.
