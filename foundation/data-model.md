# Data Model

The schema is designed now to accommodate later public accounts/bookmarks/comments
(`profiles` + `role` already present) without building those features at MVP.

*(Amended 2026-06-22 — `0004_editorial_workflow` added the governed editorial workflow: an
expanded status lifecycle, admin `comments`/directives, `revisions` history, `series`, an
`audit_log`, and soft-delete. `0005_reader_engagement` then added public reader accounts —
`bookmarks`, public `reader_comments`, `subscriptions`, and the `public_profiles` view. Note the
two comment tables are distinct: admin-only `comments` (control signals) vs. public
`reader_comments` (social).)*

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
- **public_profiles** — a `SECURITY DEFINER` view exposing only `(id, display_name, avatar_url)`,
  granted to anon/authenticated, so comment authors render without leaking email/role.
- **bookmarks** `(user_id FK→profiles, artifact_id FK→artifacts, created_at, PK(user_id,artifact_id))` — private.
- **reader_comments** `(id, artifact_id FK, author_id FK→profiles, body, status enum
  reader_comment_status{visible|hidden|removed}, edited, created_at, updated_at)` — public social
  comments, **distinct** from the editorial `comments` table. Admin moderates via status.
- **subscriptions** `(id, user_id FK→profiles, scope='all', created_at, UNIQUE(user_id,scope))` —
  records intent; RSS now, email later.

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
- `bookmarks` / `subscriptions`: private to the owner (`user_id = auth.uid()`).
- `reader_comments`: anon SELECT of `status='visible'` on a live published artifact; author
  inserts/edits/deletes own; admin moderates any. `public_profiles` view: public SELECT.

## Open questions
- **Resolved (2026-06-22):** `published` edits mutate in place **and** snapshot the prior
  version to `revisions` (recoverable), rather than forking a new artifact row.
- Do supporting (non-primary) rejected sources also block re-draft, or only primary?
  Current rule: only primary blocks. Trigger: a re-draft slips through on a supporting match.
