import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function fetchBottles() {
  const { data, error } = await client
    .from('bottles')
    .select('*')
    .order('finished_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function uploadPhotos(files) {
  const urls = [];
  for (const file of files) {
    const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : '';
    const path = `${crypto.randomUUID()}${ext}`;
    const { error } = await client.storage.from('bottle-photos').upload(path, file);
    if (error) throw error;
    const { data } = client.storage.from('bottle-photos').getPublicUrl(path);
    urls.push(data.publicUrl);
  }
  return urls;
}

export async function deletePhotos(urls) {
  const marker = '/object/public/bottle-photos/';
  const paths = urls
    .map(url => url.split(marker)[1])
    .filter(Boolean)
    .map(decodeURIComponent);
  if (!paths.length) return;
  const { error } = await client.storage.from('bottle-photos').remove(paths);
  if (error) console.error('Could not delete photo files from storage:', error);
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
