# Security & Privacy

## Threat model (public repo, autonomous writer, public read site)
- **Public repo** → anyone reads the code. **Zero secrets committed, ever.** All keys live
  in env vars / connector auth.
- **Autonomous writer** → a scheduled routine writes to the database without per-action
  human approval. Its blast radius must be bounded by the database, not by trust in the
  prompt.
- **Public read site** → anonymous users must see **published** artifacts only; never
  drafts, rejected items, or other users' data.

## No-secrets rule
- Nothing secret is committed. `.env.local` is git-ignored; `.env.example` documents every
  variable with empty values and is kept in lockstep with the code (`build-conventions.md`,
  `deployment.md`).
- Browser-safe values use the `NEXT_PUBLIC_` prefix (Supabase URL, anon key). Everything
  else is server-only.

## The service-role key is server-only (used only inside the Knovo API)
- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS. It is a **server-only** env var in Vercel,
  **never** `NEXT_PUBLIC_`, **never** sent to the client, and **never** given to a worker or
  the management connector.
- It is used **only** inside the governed Knovo worker API (`app/api/worker/*` via
  `lib/supabase/admin.ts`) and the admin's own server actions — the trusted code that
  validates and audits every write.

## Governed worker API — the load-bearing control *(amended 2026-06-22)*
The routine UI warns that attached connectors can be used for **writes without asking
permission during runs**, and the Supabase **management** connector is org-wide root. So the
guarantee cannot live in the prompt or a connector — it lives in a trusted API boundary:

- Workers never touch Supabase directly. They call the **Knovo API** (`api.knovo.ai`) with a
  **per-worker bearer token** (`KNOVO_WORKER_TOKEN_*`) scoped to specific **verbs**
  (`lib/worker-auth.ts`): Scout can dedup+create; Editor can also update/transition/resolve/
  series.
- The API (service-role, server-only) is the single enforcement point. It:
  - **validates** every document with zod before storage (invariant #9; HTTP 422 on failure),
  - enforces **status transitions** — workers may only target `needs_review`/`published`/
    `archived`; `published` requires admin **approval or an `iterate_and_publish` directive**;
    editing/archiving live content requires an admin directive,
  - **soft-deletes** only (`deleted_at`) — no hard delete or DDL is reachable,
  - **audit-logs** every mutation (`audit_log`) and snapshots prior versions (`revisions`).

So even a fully compromised or prompt-injected worker can only do governed, recoverable,
audited content actions — never publish without admin intent, never destroy data, never reach
the database schema or infrastructure.

## RLS policies (summary)
RLS still bounds **browser/admin** access (the worker path is the API, which uses service-role
and bypasses RLS — governance is enforced in the API instead).

| table | anon | authenticated admin | worker (via API/service-role) |
|---|---|---|---|
| profiles | — | read own; update `role` | — |
| artifacts | SELECT `status='published' AND deleted_at IS NULL` | full | governed CRUD (API-enforced) |
| sources / artifact_sources | SELECT (tied to a live published artifact) | full | insert/read |
| series | SELECT all | full | create/attach |
| comments / revisions / audit_log | — | read (admin) / write comments | API-only |

- RLS is **enabled on every table**; default-deny, policies grant the minimum above.
- `admin` privilege is checked via `profiles.role` of the authenticated user (`is_admin()`).
- Anon's visibility of `sources`/`artifact_sources` is constrained to rows joined to a **live
  published** artifact, so draft/rejected/soft-deleted provenance never leaks.
- The old per-row `knovo_routine` DB role was dropped in migration 0004 (superseded by the API).

## Privacy
- MVP collects no public-user data (no public accounts). The only authenticated user is the
  admin. `profiles` exists for future accounts but is unused beyond the admin at MVP.
- Source `raw_meta` stores public scientific metadata only — no personal data.

## Network isolation (routine cloud env)
Routine sessions run in a network-allowlisted cloud env: MCP connector traffic is routed
through Anthropic, but direct HTTPS to other hosts is blocked unless allowlisted. Each worker's
env allows only `api.knovo.ai` (the governed API) plus `data.rcsb.org`/`files.rcsb.org` (PDB),
and holds its `KNOVO_WORKER_TOKEN_*` as an env var. See `docs/routines.md`.

## Open questions
- **Resolved (2026-06-22):** the routine's least-privilege mechanism is the **governed Knovo
  API with per-worker verb-scoped tokens** (service-role server-only inside the API), replacing
  the dropped `knovo_routine` DB role.
- Admin audit log: `audit_log` now records actor/action/artifact for every API mutation. Open:
  whether admin **dashboard** actions also need richer audit beyond `reviewed_by`/`reviewed_at`.
  Trigger: first need to answer "which admin changed this and when" in detail.
- Worker-token rotation/storage hardening (hashed at rest vs. env compare). Trigger: more
  workers, or a token-exposure scare.
