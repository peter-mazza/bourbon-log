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
