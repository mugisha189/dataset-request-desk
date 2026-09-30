# Notes

## 1. Design

**Data model.** Six tables: `users`, `episodes`, `dataset_requests`,
`request_status_events` (append-only audit trail — one row per status change,
with actor and timestamp), `assignments` (one row per episode-on-a-request,
unique on `episode_id` so an episode can never be attached to two requests at
once), and `import_batches` (one row per CSV import run, with a JSON report of
what happened to each row). State lives entirely in Postgres; there's no
cache or queue. The status machine is enforced in
`app/services/transitions.py` as an explicit table of
`{from_status: {to_status: {allowed_roles}}}`, checked server-side on every
transition — the UI just shows the buttons a role happens to be allowed to
press.

**Frontend design system.** At my own request, the UI (component library,
palette, DataTable, dashboard blocks, ECharts wrappers) is patterned closely
after an internal back-office design system I've used on another project —
same component shapes and conventions, adapted to this domain's data rather
than invented from scratch. The one thing not carried over verbatim is the
typeface: that system ships a commercial font licensed for its own company's
properties, which isn't mine to redistribute in a public repo, so this
project uses Space Grotesk (Google Fonts, a similar geometric sans) instead.

**Hardest decisions:**

1. **What counts as a duplicate on import, and how to make re-running a file
   idempotent without loading everything into memory.** I normalize
   `episode_id` (trim + uppercase) as the natural key, treat it as authoritative
   even across re-exports, and de-duplicate in two places: within the file
   (first valid occurrence wins, later ones are reported as duplicates) and
   against what's already in the database (checked with one batched
   `SELECT ... WHERE episode_id IN (...)` rather than a per-row query, so this
   doesn't fall over at 200k rows). The actual insert also uses
   `INSERT ... ON CONFLICT DO NOTHING` on the DB's unique constraint, so even
   if two imports of the same file raced each other, no duplicate could land.
2. **Where to draw the line between "clean it up" and "reject it" for messy
   CSV data.** E.g. `" Pick Cup "` and `"PICK CUP"` I normalize (trim +
   lowercase) rather than reject, because it's clearly the same task name and
   rejecting it would be needlessly strict for a company you actually work at.
   But `duration_seconds = 999999` or `-5`, an unknown `robot_id`, or a
   `recorded_at` in the far future I reject outright and report, because
   guessing what those "should" be would silently corrupt the dataset. The
   full list of rules is in `app/services/import_episodes.py`.
3. **How to enforce the `delivered` transition needing enough assigned
   episodes, and where.** I check this inside the same transaction as the
   status change (`apply_transition`), not as a separate validation step,
   so there's no window where a request could be marked delivered and then
   fail a "does it actually have enough episodes" check afterwards.

## 2. What I left out or simplified

- **No stretch item.** Given the time budget, I prioritised getting the core
  domain rules, tests, and operability right over a bonus feature. With two
  more days I'd add the background-export stretch (§4.3 in the brief):
  simulated export jobs per assignment with retry, since the `Assignment`
  model already has `export_status` / `export_attempts` / `export_error`
  columns reserved for exactly this, and a first version of it "just" needs an
  async worker loop.
- **No pagination** on `/api/episodes` or `/api/requests` — episodes are
  capped at a `limit` query param (default 200, max 1000) instead of real
  cursor pagination, which is fine for the current data volume but would need
  proper `after`/`before` cursors before shipping this against a database of
  millions of episodes.
- **No password reset / email verification / rate limiting on login** — out
  of scope for an internal tool with a handful of accounts created by an
  admin, but a real product would need at least login rate limiting.
- **The frontend has no optimistic UI or toast notifications** — every
  action (assign an episode, change a status) re-fetches and re-renders the
  view it affects rather than updating local state speculatively. It's built
  with React + TypeScript + Vite + Tailwind + Radix UI + ECharts, with a
  shared `DataTable` (search, filters, row-action portal, pagination,
  CSV/Excel/PDF export) and `useAsync`/`useDebounced` data-fetching pattern
  used identically on every listing, rather than each page inventing its own
  — the one piece of that pattern deliberately left dormant is the table's
  card-view toggle: the prop exists but nothing here passes a `cardRenderer`,
  because none of this domain's tables are the kind of visual content a card
  grid suits. No i18n either — this is a single-language internal tool.
- **Exports are generated on request, not cached or queued.** For CSV/Excel
  that's instant even at a few thousand rows; the PDF path builds the whole
  document in the request before responding, which is the first thing that
  would need to move to a background job if an export ever needed to cover
  the "5 million episodes" scale §5 talks about — nothing here is designed
  to page through a huge export.
- **No soft-delete / undo** for assignments or requests — unassigning an
  episode really deletes the assignment row (its history isn't kept, though
  the request's own status history is).

## 3. Something that went wrong

While testing the analytics endpoint against real data I noticed
`median_submitted_to_delivered_hours` came back `null` even for a request
I'd just walked all the way through `submitted → in_progress → delivered →
accepted`. The median query joins the `request_status_events` row where
`to_status = 'submitted'` against the one where `to_status = 'delivered'` for
the same request — and it turned out `create_request` set the initial
`status` column directly on the row without ever writing the corresponding
`submitted` event, so there was nothing for the query to join against. I
found it by manually driving a request through the API with `curl` and
checking `/api/analytics` after each step rather than trusting the unit
tests alone (the tests happened to only assert on the *count* of status
events, not on analytics). Fixed by writing an explicit "submitted" event at
creation time (`app/routers/requests.py`); I also added a test
(`test_every_transition_is_recorded_with_actor`) that checks the event count
so this can't silently regress.

## 4. Security

- Passwords are hashed with bcrypt (via `passlib`) — never stored or logged
  in plain text. The seed step reads plaintext passwords from
  `seed/users.json` (as given) but only ever writes the hash to the database.
- Auth is a JWT (HS256) in an **httpOnly** cookie, so it isn't reachable from
  page JavaScript (mitigates XSS token theft); `Authorization: Bearer` is also
  accepted for scripting/testing. The signing secret is read from
  `JWT_SECRET` (env var, not committed) — `.env` is gitignored, and
  `.env.example` documents the shape without real secrets.
- Every write endpoint re-checks the role and, for clients, that the request
  actually belongs to them (`_authorize_view`, `apply_transition`) — the brief
  is explicit that hiding a button in the UI is not authorization, and none of
  the enforcement here happens client-side.
- Input validation is via Pydantic schemas on every request body (types,
  `Field(gt=0)`, email format, min password length), and the CSV importer
  treats every field as untrusted and validates/normalizes it before it
  touches the database (see §1).
- All database access goes through SQLAlchemy's parameterized queries —
  including the hand-written analytics SQL, which binds `:start`/`:end`
  rather than interpolating strings — so there's no SQL injection surface.

**The two vulnerabilities I'd worry about most in this kind of system:**

1. **JWTs that can't be revoked before they expire.** If an admin deactivates
   a user or demotes them, their existing token still verifies until it
   expires (up to 12h here) because `get_current_user` only checks
   `is_active`/role from the token's `sub`, which *is* re-checked against the
   DB on every request (so deactivation *does* take effect immediately) — but
   there's no way to revoke a single stolen token without deactivating the
   whole account. A production version would want a server-side token
   allow/deny-list or short-lived access tokens with refresh tokens.
2. **The CSV import endpoint accepting arbitrarily large/adversarial files
   from any operator.** There's no upload size limit or content-type
   sniffing beyond what FastAPI/Starlette does by default, so a malicious or
   just-way-too-large file from a compromised operator account could exhaust
   memory or disk. I'd add a max upload size and move parsing to a background
   job with a hard row cap before this goes anywhere near production.

## 5. Scale

**What breaks first at 10× users (a few dozen operators/clients):** nothing
in the current design breaks at that scale — the bottleneck is UI ergonomics
(the flat requests list has no pagination or saved filters yet), not the
database or API.

**What breaks first at 100× episodes (currently ~200, so ~20k, and the brief
also asks about 5M):**
- The `episodes` table already has indexes on `robot_id`, `task_name`,
  `quality`, and `recorded_at` (the columns the analytics queries and list
  filters actually use), and the three analytics queries are all
  `GROUP BY`/aggregate queries executed in Postgres, not Python — so they
  scale with Postgres' ability to use those indexes, not with rows pulled
  over the wire. At 5M rows I would expect the per-day-per-robot and top-task
  queries to remain fast (index + aggregate scan), and the median calculation
  to be the first to need attention because it self-joins
  `request_status_events`, which grows with status changes, not with
  episodes — that stays small.
- The CSV import already avoids per-row queries and inserts in batches of
  1000 rows using `ON CONFLICT DO NOTHING`, so raw import throughput is not
  the first bottleneck. What *would* need to change first: importing a 200k+
  row file inside a single synchronous HTTP request will eventually hit a
  request timeout; that endpoint should become "accept the file, hand it to a
  background job, return a batch id to poll" once files get that large.
- `GET /api/episodes`, `GET /api/requests` and `GET /api/users` use offset
  pagination (`LIMIT`/`OFFSET` plus a `count(*)` for the total, both run in
  the database — see `app/services/listing.py`). That's fine up to a few
  hundred thousand rows; past that, `OFFSET` on a late page still has to
  walk every row before it, so at 5M+ episodes I'd switch episodes to keyset
  pagination (`WHERE recorded_at < :cursor ORDER BY recorded_at DESC LIMIT
  :n`) and drop the total count from that response (an exact count over 5M
  rows is itself not cheap; a "still more" boolean is enough for a Next
  button).
- The `assignments` table's `UNIQUE(episode_id)` constraint is what actually
  enforces "an episode can be assigned to at most one request" under
  concurrent operators — that's a DB-level guarantee, not an
  application-level check-then-insert race, so it doesn't get worse with more
  concurrent operators.
