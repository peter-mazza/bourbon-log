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
