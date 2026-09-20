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
