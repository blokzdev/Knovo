# Data Model

The schema is designed now to accommodate later public accounts/bookmarks/comments
(`profiles` + `role` already present) without building those features at MVP.

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
| status | enum `artifact_status` | `draft` \| `published` \| `rejected`; default `draft` |
| schema_version | int | artifact-schema version the `doc` conforms to |
| doc | jsonb | the slot document (zod-validated before insert) |
| created_by | uuid | routine/admin actor (nullable for routine cred) |
| reviewed_by | uuid | admin who actioned it (FK profiles) |
| reviewed_at | timestamptz | |
| published_at | timestamptz | set on promote |
| rejected_reason | text | set on reject |
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

## Status lifecycle
```
            ┌─────────┐  admin promote   ┌────────────┐
            │  draft  │ ───────────────► │ published  │
  routine → │ (only)  │                  └────────────┘
  inserts   │         │  admin reject    ┌────────────┐
            └─────────┘ ───────────────► │ rejected   │ (terminal)
                                         └────────────┘
```
- Routine writes `draft` only.
- Admin moves `draft → published` or `draft → rejected`.
- `rejected` is terminal; findings are never re-drafted (see dedup).
- `published` may later be unpublished/edited by admin (admin-only; not a routine path).

## Dedup (seen + rejected)
Two helper views support the routine's pre-draft check:
- **`seen_source_keys`** — every `(source_db, source_uid)` linked to *any* artifact.
  A new finding whose primary source is already here is a duplicate → skip.
- **`rejected_source_keys`** — `(source_db, source_uid)` of the **primary** source of any
  `status = rejected` artifact. A finding matching these is never re-drafted → skip.

The routine queries both before authoring. This makes "deduplicated against already-seen
and rejected sources" (Decision 3) a property of the data, not of the routine's memory.

## RLS summary (full policies in security-and-privacy.md)
- `profiles`: read own; admin reads all; only admin updates `role`.
- `artifacts`: anon SELECT where `status='published'`; admin full; **routine INSERT only,
  status forced `draft`**.
- `sources` / `artifact_sources`: routine INSERT; public reads rows tied to published
  artifacts.

## Open questions
- Should `published` edits create a new artifact version row vs. mutate in place? Trigger:
  first time an admin needs to correct a live artifact.
- Do supporting (non-primary) rejected sources also block re-draft, or only primary?
  Current rule: only primary blocks. Trigger: a re-draft slips through on a supporting match.
