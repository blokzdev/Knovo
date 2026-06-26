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
- **Operator-set runtime secrets may live in the DB, not the repo.** Admin-managed routine-trigger
  credentials set in `/admin/settings` are stored in `routine_configs`/`app_settings` (`0008`) —
  still zero secrets in the repo (Decision 8, amended 2026-06-23). See below.

## Dashboard-stored routine secrets (BYOK) *(0008, amended 2026-06-23)*
The admin can store each worker routine's **fire-trigger URL + bearer token** (and the global
`KNOVO_API_BASE`) in the HUD instead of redeploying env vars. The posture:
- **Admin-only at rest.** `routine_configs`/`app_settings` have RLS `is_admin()` and no anon grant.
- **Server-only reads, never to the browser.** The token is read only via service-role server code
  (`fireWorker`, `getRoutineSettings`); the settings page returns a **masked** view (`••••last4` +
  a `source` flag), never the token itself. The save action is write-only for the token (blank =
  keep, explicit clear = unset) and never echoes or audit-logs the value.
- **Token-exfiltration guard.** Both the save action and `fireWorker` validate the fire URL with
  `isAllowedFireUrl` (https + an Anthropic/Claude host allowlist) before the token is ever sent, so
  a mistyped or wrong URL cannot leak it.
- **Audited.** Every change writes an `audit_log` entry (`config:routine:<worker>` / `config:app:*`)
  recording which fields changed — never the secret.
- **Env fallback.** Dispatch resolves DB-first, falling back to `ROUTINE_*` env vars.
- **Deferred:** encryption-at-rest for the stored token (acceptable for a single-admin HUD;
  `BACKLOG.md`).

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
  (`lib/worker-auth.ts`): **Scout** = dedup/create; **Editor** = + update/status/resolve/series/
  flag; **Keeper** = targets/update/status/flag (no create/series/resolve). A leaked token can
  only do that worker's verbs, and never publish without an admin directive.
- The API (service-role, server-only) is the single enforcement point. It:
  - **validates** every document with zod before storage (invariant #9; HTTP 422 on failure),
  - enforces **status transitions** — workers may only target `needs_review`/`published`/
    `archived`; `published` requires admin **approval or an open `publish_after` directive**;
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
| routine_configs / app_settings | — | admin CRUD (token read server-side only, masked in UI) | — |
| bookmarks / subscriptions | — | owner CRUD (`user_id = auth.uid()`) | — |
| reader_comments | SELECT `status='visible'` on a live published artifact | author CRUD own; **admin moderates any** | — |

- RLS is **enabled on every table**; default-deny, policies grant the minimum above.
- `admin` privilege is checked via `profiles.role` of the authenticated user (`is_admin()`).
- Anon's visibility of `sources`/`artifact_sources` is constrained to rows joined to a **live
  published** artifact, so draft/rejected/soft-deleted provenance never leaks.
- Reader comment authors render from `reader_comments.author_name`/`author_avatar`, **stamped at
  insert by a SECURITY DEFINER trigger** from the author's profile — public, immutable, and
  spoof-proof (sourced from `auth.uid()`'s row, not client input). No `profiles` columns reach
  anon, and there is no SECURITY DEFINER view (the `0005` `public_profiles` view was removed in
  `0006`). Reader profiles are read-only from the Google identity (no self-update policy), so a
  reader cannot escalate their own `role`.
- The old per-row `knovo_routine` DB role was dropped in migration 0004 (superseded by the API).

## Privacy
- Reading is account-free. **Optional** reader accounts (Google sign-in, Phase 1d) collect
  email + name + avatar from the Google identity, and store the reader's bookmarks, public
  comments, and subscription preference. Comments are public (name + avatar shown); bookmarks and
  subscriptions are private. See `/legal/privacy`.
- Source `raw_meta` stores public scientific metadata only — no personal data.

## Audience measurement (privacy-first, no PII) *(0011, 2026-06-26)*
To answer the open Phase-2 validation question — *are practitioners finding and **returning** to the
explainers?* — published artifacts carry a **server-side, cookieless, no-PII** view/return measure.
Chosen deliberately over any third-party analytics or tracking cookie (honors the "decline
non-essential" stance — there is nothing to decline because nothing is set in the browser):
- **No cookie, no third party.** Recording happens during the `/a/[slug]` server render
  (`lib/audience/record.ts`), never from client JS; no script, pixel, or external service is loaded.
- **No PII stored.** A reader is keyed by `visitor_hash = HMAC(salt, ip + ua)` computed **inside** the
  `SECURITY DEFINER` Postgres recorder; the **IP and User-Agent are never persisted** — only the hash.
- **Salt rotation = bounded linkability.** The HMAC salt lives server-side in `audience_salt`, is
  randomly generated, and is **rotated (and the prior salt destroyed) every 7-day window**, so a hash
  is only linkable within its window. "Returning reader" is therefore a within-the-week signal by
  construction; cross-window returns are intentionally unlinkable.
- **Deduped daily; bots + prefetches excluded.** One row per `(artifact, day, visitor_hash)` (repeat
  same-day visits bump a `hits` counter); the recorder skips bot/crawler/AI-fetcher User-Agents and
  Next.js router prefetches so the signal reflects real human reads.
- **Hashes never reach a browser.** `artifact_views`/`audience_salt` have **no anon/authenticated RLS
  grant**; the admin Insights page reads them via the **service-role** client and aggregates
  server-side, sending only the view model (counts) to the client.
- **Residual caveat (documented).** The salt is a server-only secret; if both the salt and the stored
  hashes leaked *within the same 7-day window*, a holder of a candidate IP+UA could confirm presence
  for that window. Mitigated by per-window rotation + destruction and the service-role-only read;
  acceptable for a single-tenant validation tenant. (Per-tenant salts are a future hardening — see
  `data-model.md` multi-tenant note.)
- **Deployment note.** New SQL functions need a PostgREST schema-cache reload before `.rpc()` resolves
  them; hosted Supabase reloads automatically on migrate, but a local stack needs
  `notify pgrst, 'reload schema';` (or a `supabase_rest` restart) after `supabase migration up`.

## Network isolation (routine cloud env)
Routine sessions share one network-allowlisted cloud env ("Knovo", **Custom** access): MCP
connector traffic is routed through Anthropic, but direct HTTPS to other hosts is blocked unless
allowlisted. The allowlist is only `api.knovo.ai` (the governed API) plus `data.rcsb.org`/
`files.rcsb.org` (PDB); the env holds the three `KNOVO_WORKER_TOKEN_*` as env vars. **Caveat:**
Claude Code on the web has no separate secrets store, so these bearer tokens sit in (platform-
non-secret) env vars, visible to anyone who can edit the environment — acceptable under the
single-admin model; tokens are verb-scoped + revocable, so rotate if the environment is ever
shared. See `docs/routines.md`.

## Open questions
- **Resolved (2026-06-22):** the routine's least-privilege mechanism is the **governed Knovo
  API with per-worker verb-scoped tokens** (service-role server-only inside the API), replacing
  the dropped `knovo_routine` DB role.
- Admin audit log: `audit_log` now records actor/action/artifact for every API mutation. Open:
  whether admin **dashboard** actions also need richer audit beyond `reviewed_by`/`reviewed_at`.
  Trigger: first need to answer "which admin changed this and when" in detail.
- Worker-token rotation/storage hardening (hashed at rest vs. env compare). Trigger: more
  workers, or a token-exposure scare. *(Now also covers the DB-stored routine-trigger token in
  `routine_configs` — plaintext at rest, mitigated by admin-only RLS + server-only reads + masked
  UI; encryption-at-rest deferred to the same trigger.)*
