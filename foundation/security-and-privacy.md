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

## The service-role key is server-only
- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS. It is set as a **server-only** env var in
  Vercel, **never** `NEXT_PUBLIC_`, and **never** sent to the client or imported into a
  client component. It is used only in server actions/route handlers that need elevated
  access, and sparingly.
- The autonomous routine does **not** use the service-role key (see below).

## Least-privilege routine credential (the load-bearing control)
The routine UI warns that attached connectors can be used for **writes without asking
permission during runs**. Therefore the "drafts only, no publish/update/delete" guarantee
**cannot live in the prompt or the connector** — it must be enforced by the database:

- The routine authenticates to Supabase with a **dedicated low-privilege credential**, not
  the service-role key and not an admin session.
- RLS grants that credential **INSERT only** on `artifacts` (with `status` forced to
  `draft`), `sources`, and `artifact_sources`. No `UPDATE`, `DELETE`, or publish path is
  granted to it.
- A `CHECK`/trigger rejects any insert into `artifacts` with `status <> 'draft'` from the
  routine path.

So even a fully compromised or misbehaving routine can only ever add drafts — it can never
publish, alter, or delete anything.

## RLS policies (summary)
| table | anon | routine cred | admin |
|---|---|---|---|
| profiles | — | — | read all; update `role` |
| artifacts | SELECT where `status='published'` | INSERT only, `status='draft'` | SELECT/UPDATE/DELETE |
| sources | SELECT (tied to published) | INSERT | SELECT |
| artifact_sources | SELECT (tied to published) | INSERT | SELECT |

- RLS is **enabled on every table**; default-deny, policies grant the minimum above.
- `admin` privilege is checked via the `profiles.role` of the authenticated user.
- Anon's visibility of `sources`/`artifact_sources` is constrained to rows joined to a
  published artifact (so draft/rejected provenance never leaks).

## Privacy
- MVP collects no public-user data (no public accounts). The only authenticated user is the
  admin. `profiles` exists for future accounts but is unused beyond the admin at MVP.
- Source `raw_meta` stores public scientific metadata only — no personal data.

## Open questions
- Exact mechanism for the routine's least-privilege credential in the Supabase connector
  (dedicated DB role vs. restricted API key vs. scoped service account). Trigger: wiring the
  routine's Supabase auth in Phase 0 Part B.
- Whether admin actions need an audit log beyond `reviewed_by`/`reviewed_at`. Trigger:
  first need to answer "who changed this and when".
