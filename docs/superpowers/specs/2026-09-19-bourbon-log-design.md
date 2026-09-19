# Bourbon Log — Design

## Purpose

A personal, single-user web app for logging finished bourbon bottles: a
photo (or several), a rating, and a tasting note per bottle. Replaces
the current workflow of photographing the bottle and writing a note in
Apple Notes. Includes a one-time bulk import of the existing Apple
Notes backlog (under 50 bottles).

## Non-goals

- No multi-user support, accounts, or login — single user, no auth.
- No offline support or retry queues.
- No automated test suite — this is manually verified in-browser given
  its size.

## Architecture

A single static page (HTML/CSS/JS, no framework) hosted on GitHub
Pages, talking directly to Supabase (hosted Postgres + object storage)
from the browser via the `supabase-js` client library loaded from a
CDN. No custom backend/server code.

- **Project URL:** `https://xhheuymibmnjenodxigw.supabase.co`
- **Publishable key:** `sb_publishable_RkpNYWH394ZmmmPNzs_OiQ_7DhjqUDC`
  (safe to embed client-side by design — this is Supabase's
  browser-facing key, analogous to a Stripe publishable key)
- **Storage bucket:** `bottle-photos`, public

The user adds the deployed page to their iPhone home screen for
quick access; the same URL works from a desktop browser too.

## Data model

```sql
create table bottles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  distillery text,
  proof numeric(4,1),
  rating numeric(3,1),
  note text,
  photo_urls text[],
  finished_date date,
  created_at timestamptz default now()
);
```

- `distillery`, `proof`, `rating`, `note`, `photo_urls`, and
  `finished_date` are all nullable — a bare-bones entry is valid, and
  gaps (e.g. distillery/proof on backfilled old entries) can be filled
  in later via edit.
- `photo_urls` is an unbounded array of Storage URLs — no cap on
  photo count per bottle.
- Row Level Security is disabled on this table. Documented trade-off:
  anyone who obtained the project URL + publishable key could read or
  write this table, since there is no per-request auth. Accepted here
  because this is a private hobby app with no sensitive data and no
  public distribution of the link.

## Components (single page, three views toggled by JS)

- **List view** (default): every bottle, newest `finished_date`
  first. Each row shows the bottle's first photo as a thumbnail,
  name, and rating. Tapping a row opens the detail view.
- **Detail/Edit view**: shows all fields and all photos (as a row of
  thumbnails, tappable to view full-size). An Edit control turns
  fields into inputs in place and saves back to the row on submit —
  this is how distillery/proof get backfilled on older entries, and
  how ratings/notes get corrected.
- **Add view**: form with a file input (`multiple`, and
  `capture="environment"` so it can open the phone camera directly),
  name, distillery, proof, rating (0.0–10.0, one decimal), note,
  and finished date (defaults to today).

## Data flow

- **Add/Edit:** selected photo file(s) upload directly to the
  `bottle-photos` Storage bucket; the resulting public URLs are
  collected into `photo_urls`. The row is then inserted (`add`) or
  updated (`edit`) in `bottles` with all form fields.
- **List:** on load, `select * from bottles order by finished_date
  desc`.
- **Import (bulk backlog):** a one-time local AppleScript dumps each
  Apple Note's raw body text and creation date to a JSON file (text
  extraction is reliable via AppleScript; attachment/photo extraction
  is not, so photos are not part of this automated step). The Add
  view can be pre-filled from one of these dumped entries so the user
  only needs to review/trim the note text, attach the matching
  photo(s), and set rating/distillery/proof, rather than retyping
  everything from scratch. This script is a one-time local tool, not
  part of the deployed app.

## Error handling

Minimal by design, consistent with a single-user tool: a failed
Storage upload or database write shows an inline error banner and
leaves the form's entered data intact (nothing is cleared on
failure), so the user can just retry. No retry queues, no offline
queueing.

## Testing

No automated test suite — manually exercised in a live browser
(add, edit, list, detail, multi-photo upload, import pre-fill flow)
before considering the work done.
