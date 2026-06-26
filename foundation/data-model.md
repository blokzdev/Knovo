# Data Model

The schema is designed now to accommodate later public accounts/bookmarks/comments
(`profiles` + `role` already present) without building those features at MVP.

*(Amended 2026-06-22 — `0004_editorial_workflow` added the governed editorial workflow: an
expanded status lifecycle, admin `comments`/directives, `revisions` history, `series`, an
`audit_log`, and soft-delete. `0005_reader_engagement` then added public reader accounts —
`bookmarks`, public `reader_comments`, `subscriptions` (`0006` hardened these: author display
denormalized onto the comment row, RLS perf, FK indexes). Note the two comment tables are
distinct: admin-only `comments` (control signals) vs. public `reader_comments` (social).)*

*(Amended 2026-06-23 — `0008_routine_settings` added two admin-only dashboard-config tables,
`routine_configs` and `app_settings`, for the in-HUD routine-trigger settings (BYOK). They sit
outside the worker API + slot schema and are never touched by workers.)*

*(Amended 2026-06-26 — `0011_audience_views` added privacy-first audience measurement
(`artifact_views` + `audience_salt` + the `record_artifact_view` recorder). Like the reader and
config tables, these sit **outside** the worker API + slot schema; the worker surface is unchanged.
See "Audience measurement" below.)*

## Tables

### profiles
Mirrors `auth.users`; carries role.
| column | type | notes |
|---|---|---|
| id | uuid PK | FK → `auth.users(id)` |
| email | text | |
| role | enum `user_role` | `admin` \| `viewer`; default `viewer` |
| display_name | text | nullable |
| created_at | timestamptz | default now() |

`role = admin` is granted manually (no self-service escalation). The autonomous routine
does **not** use an `admin` profile (see least-privilege below).

### sources — provenance registry + dedup key
Every grounded source is stored once here.
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| source_db | enum `source_db` | `pdb` \| `chembl` \| `pubmed` \| `biorxiv` |
| source_uid | text | **stable external identifier** (PDB ID, ChEMBL ID, PMID, DOI) |
| url | text | canonical link the admin can open |
| title | text | |
| retrieved_at | timestamptz | when the routine fetched it |
| raw_meta | jsonb | raw response snapshot for audit |
| | | **UNIQUE(source_db, source_uid)** ← "already seen" key |

### artifacts — the documents + lifecycle
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| slug | text UNIQUE | clean public URL: `/a/<slug>` |
| title | text | |
| summary | text | short abstract for cards + JSON-LD |
| status | enum `artifact_status` | `draft` \| `needs_review` \| `changes_requested` \| `approved` \| `published` \| `rejected` \| `archived`; default `draft` |
| schema_version | int | artifact-schema version the `doc` conforms to |
| doc | jsonb | the slot document (zod-validated in the Knovo API before write) |
| created_by | uuid | admin actor (nullable; worker writes set `last_worker` instead) |
| reviewed_by | uuid | admin who actioned it (FK profiles) |
| reviewed_at | timestamptz | |
| published_at | timestamptz | set on publish |
| rejected_reason | text | set on reject |
| **deleted_at** | timestamptz | **soft-delete**; public reads exclude non-null |
| **series_id** | uuid | FK → `series` (nullable) |
| **series_order** | int | position within the series |
| **last_worker** | text | last worker actor (e.g. `worker:editor`) |
| created_at / updated_at | timestamptz | |

### artifact_sources — provenance/citation links
Join feeding the auto-rendered provenance footer.
| column | type | notes |
|---|---|---|
| artifact_id | uuid | FK → artifacts |
| source_id | uuid | FK → sources |
| role | enum `source_role` | `primary` \| `supporting` |
| citation_text | text | human-readable citation the admin verifies |
| | | PK(artifact_id, source_id) |

### series — collections
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| slug | text UNIQUE | clean URL for the series |
| title / summary | text | |
| created_at | timestamptz | |
Artifacts join via `artifacts.series_id` (+ `series_order`).

### comments — admin editorial directives (NOT public comments)
A directive has **two axes** — an optional `action` (what to do) and a `publish_after` flag
(whether to publish when done) — plus a free-text `note` and optional advanced `options`. An
*actionable* directive has an action OR is flagged publish_after; plain notes (neither) are a
human record and do not enter the worker queue.
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| artifact_id | uuid | FK → artifacts |
| author | uuid | admin (FK auth.users); null for system |
| note | text | natural-language instruction the worker obeys |
| action | enum `directive_action` | content: `revise` \| `expand` \| `condense` \| `reverify` \| `split`; curation: `make_series` \| `add_to_series`; lifecycle: `archive` (nullable = plain note / publish-as-is) |
| publish_after | bool | "...and publish when done" (the headline toggle); default `false` |
| options | jsonb | optional advanced params (future: target series, tone/length, …) |
| status | enum `comment_status` | `open` \| `addressed` \| `dismissed` |
| created_at / addressed_at | timestamptz | |
| addressed_by | text | worker that handled it |

Examples: *iterate & publish* = `revise` + `publish_after:true`; *iterate & return for review* =
`revise` + `publish_after:false`; *publish as-is* = `action:null` + `publish_after:true`.

### revisions — version history (recoverability)
`(id, artifact_id FK, schema_version, doc jsonb, title, summary, note, created_by, created_at)`.
The Knovo API snapshots the prior `doc` here before every content write.

### audit_log — who/what changed
`(id, actor text, action text, artifact_id FK nullable, detail jsonb, created_at)`. Written by
the API on every mutation (`actor` = `worker:scout|editor` or `admin:<uid>`).

## Reader engagement *(0005 — Phase 1d)*
Reader-owned tables, **outside** the worker API + slot schema (the worker surface is unchanged).
- **profiles** gain `avatar_url`; `handle_new_user` now captures `display_name`/`avatar_url` from
  the Google identity. Profile is read-only from Google in v1 (no self-update → no role escalation).
- **bookmarks** `(user_id FK→profiles, artifact_id FK→artifacts, created_at, PK(user_id,artifact_id))` — private.
- **reader_comments** `(id, artifact_id FK, author_id FK→profiles, body, status enum
  reader_comment_status{visible|hidden|removed}, edited, author_name, author_avatar, created_at,
  updated_at)` — public social comments, **distinct** from the editorial `comments` table. Admin
  moderates via status. The author's public display (`author_name`/`author_avatar`) is **stamped
  at insert by a `SECURITY DEFINER` trigger** from the author's profile (immutable, spoof-proof),
  so the public read is a single table with no `profiles` join and no exposed view (`0006`).
- **subscriptions** `(id, user_id FK→profiles, scope='all', created_at, UNIQUE(user_id,scope))` —
  records intent; RSS now, email later.

## Dashboard config *(0008 — admin-only, BYOK routine triggers)*
Admin-managed config for the dashboard "run now" dispatch, **outside** the worker API + slot
schema. `fireWorker()` reads these DB-first, falling back to env. The token is read only
server-side and never returned to the browser (the UI masks it to `••••last4`).
- **routine_configs** `(worker text PK check in (scout|editor|keeper), fire_url text, token text,
  updated_by uuid FK→auth.users, updated_at timestamptz)` — one row per worker; the per-routine API
  fire-trigger URL + bearer token. `updated_at` stamped by the shared trigger.
- **app_settings** `(key text PK, value text, updated_by uuid FK→auth.users, updated_at timestamptz)`
  — small admin-only key/value; holds `knovo_api_base` (reference for the setup guide).

Both are **admin-only** (RLS `is_admin()`, no anon grant); the trusted server reads via service_role.

## Audience measurement *(0011 — privacy-first, no PII)*
Server-side reach measurement on **published** artifacts, **outside** the worker API + slot schema.
No cookie is set, no third party is involved, and **no PII is stored** — readers are counted by a
cookieless, salted, one-way hash. Answers the open Phase-2 question: are practitioners finding +
**returning** to the explainers? (See `security-and-privacy.md` → "Audience measurement".)
- **artifact_views** `(artifact_id FK→artifacts ON DELETE CASCADE, day date, visitor_hash text,
  hits int default 1, first_seen_at, last_seen_at, PK(artifact_id, day, visitor_hash))` — one
  **deduped daily** row per (artifact, day, visitor); `hits` counts same-day repeats. Yields
  views/day (sum hits), unique readers/day (row count), top artifacts, and returns (a `visitor_hash`
  on ≥2 distinct days). RLS-enabled with **no anon/authenticated policy** — read only via the
  service-role client (admin Insights), aggregated server-side so raw hashes never reach a browser.
- **audience_salt** `(id bool PK=true singleton, salt text, window_id bigint, rotated_at)` — the
  rotating server-side salt; lazily rotated (and the prior salt **destroyed**) every 7-day window, so
  a hash is only linkable within its window. RLS-enabled, no policies.
- **record_artifact_view(p_artifact_id, p_ip, p_ua)** — `SECURITY DEFINER` recorder (execute granted
  to `service_role` only). Computes `visitor_hash = hmac(salt, ip+ua)` and upserts the deduped row;
  the IP/UA are used only inside the function and **never stored**. Called by the server-only
  `lib/audience/record.ts` from the public `/a/[slug]` render (bots + prefetches skipped).

## Status lifecycle *(amended 2026-06-22)*
```
  draft ─► needs_review ⇄ changes_requested ─► approved ─► published
    │            │                                            │
    └─────────── any ───────────────────────────────────► archived (soft-hide)
  rejected (terminal, feeds dedup)        deleted_at (soft-delete, recoverable)
```
- Workers may target only `needs_review` / `published` / `archived` via the API; the admin
  owns `approved` / `changes_requested` / `rejected` (dashboard).
- `published` requires admin **approval or an open `publish_after` directive**; editing a
  published artifact requires an open `revise` directive, archiving it an `archive` directive.
- `rejected` is terminal; never re-drafted (see dedup). Nothing is hard-deleted by a worker —
  `deleted_at` is a recoverable soft-delete; public reads exclude it.

## Dedup (seen + rejected)
Two helper views support the routine's pre-draft check:
- **`seen_source_keys`** — every `(source_db, source_uid)` linked to *any* artifact.
  A new finding whose primary source is already here is a duplicate → skip.
- **`rejected_source_keys`** — `(source_db, source_uid)` of the **primary** source of any
  `status = rejected` artifact. A finding matching these is never re-drafted → skip.

The routine queries both before authoring. This makes "deduplicated against already-seen
and rejected sources" (Decision 3) a property of the data, not of the routine's memory.

## RLS summary (full policies in security-and-privacy.md)
RLS bounds browser/admin access; **workers go through the Knovo API (service-role), so worker
governance is enforced in the API, not RLS.**
- `profiles`: read own; only admin updates `role`.
- `artifacts`: anon SELECT where `status='published' AND deleted_at IS NULL`; admin full.
- `sources` / `artifact_sources`: public reads rows tied to a live published artifact.
- `series`: public SELECT; admin writes.
- `comments` / `revisions` / `audit_log`: admin-only (no anon); written by the API.
- `routine_configs` / `app_settings`: admin-only (no anon); the token is read only server-side
  (service_role) and never sent to the browser.
- `bookmarks` / `subscriptions`: private to the owner (`user_id = auth.uid()`).
- `reader_comments`: anon SELECT of `status='visible'` on a live published artifact; author
  inserts/edits/deletes own; admin moderates any. Author display is denormalized on the row, so
  no separate profile read is needed for public rendering.
- `artifact_views` / `audience_salt`: **no anon/authenticated policy** (RLS default-deny). Writes go
  through the `SECURITY DEFINER` recorder; reads (admin Insights) use the service-role client and
  aggregate server-side, so per-visitor hashes never reach the browser.

## Multi-tenant data model (north star, not built)
*(Recorded 2026-06-23. **Vision, not current scope** — the GemBlog direction in `vision.md`; maps to
roadmap **M5**. Scope-wall per `CLAUDE.md` invariant #6. The schema today is **single-tenant** — there
is no tenant discriminator anywhere. Nothing below is built.)*

The current architecture is already the right shape for tenancy: workers never touch the DB, and the
service-role key is server-only inside the governed API — so tenant isolation is enforced at one
boundary. The future lift, recorded so it is done consciously:

- **`tenants` table** — `(id, slug UNIQUE, name, plan enum, ‹limits›, domain, domain_verified_at,
  status, created_at)`. `slug` → `‹slug›.gemblog.co`; `domain` → a Pro custom domain.
- **Tenant discriminator** — add `tenant_id uuid NOT NULL FK→tenants` (+ composite indexes, e.g.
  `(tenant_id, status)`) to every content/engagement table: `artifacts`, `sources`, `artifact_sources`,
  `series`, `comments`, `revisions`, `audit_log`, `reader_comments`, `bookmarks`, `subscriptions`,
  `routine_configs`, `artifact_views`. Dedup views (`seen_source_keys` / `rejected_source_keys`)
  become per-tenant. (`audience_salt` can stay global or go per-tenant; per-tenant salts further
  isolate visitor hashes across tenants.)
- **RLS rewrites (security-critical).** Every policy gains a tenant predicate; `is_admin()` becomes
  `is_tenant_admin(tenant_id)`. This is the **audit-before-launch** piece — a missed predicate leaks
  cross-tenant data. Needs a dedicated isolation test (TenantA cannot read TenantB).
- **Per-tenant worker tokens** — `routine_configs` keyed by `(tenant_id, worker)`; the API resolves a
  presented bearer token to its tenant (unique index on `(tenant_id, token)`) and checks the worker
  acts only within that tenant.
- **Quotas** — `usage_tracking(tenant_id, period, counts…)` + plan limits on the tenant row, enforced
  at the API write boundary (`monetization.md`).

## Open questions
- **Resolved (2026-06-22):** `published` edits mutate in place **and** snapshot the prior
  version to `revisions` (recoverable), rather than forking a new artifact row.
- Do supporting (non-primary) rejected sources also block re-draft, or only primary?
  Current rule: only primary blocks. Trigger: a re-draft slips through on a supporting match.
