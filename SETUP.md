# SETUP — Knovo (Phase 0)

How to run Knovo locally and finish the wiring. Supabase **dev** and **prod** projects already
exist (created via MCP) with the schema + RLS applied (migrations `0001`–`0004`). What remains
is local env, Google OAuth, the admin grant, the governed worker API on `api.knovo.ai`, and the
two routine workers (§6–§7).

## Supabase projects (already provisioned)
Org **Blokz Team**. Schema applied via `supabase/migrations/0001–0003`.

| Env | Project | Ref | API URL |
|---|---|---|---|
| dev | knovo-dev | `hgsgnaeevqviwagepgsw` | https://hgsgnaeevqviwagepgsw.supabase.co |
| prod | knovo-prod | `flltjufyzbxicnpqpuij` | https://flltjufyzbxicnpqpuij.supabase.co |

Get keys: Supabase dashboard → each project → **Project Settings → API**
(`anon` public key, and the `service_role` secret). Never commit these.

## 1. Local env
```bash
cp .env.example .env.local
```
Fill `.env.local` with the **dev** project values:
- `NEXT_PUBLIC_SUPABASE_URL` = the dev API URL above
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = dev project `anon` key
- `SUPABASE_SERVICE_ROLE_KEY` = dev project `service_role` key (server-only)
- `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` = from step 3

## 2. Install & run
```bash
npm install
npm run dev        # http://localhost:3000
```
- `/` — public list of published artifacts (empty until something is published)
- `/admin` — admin draft queue (requires Google sign-in + admin role)

## 3. Google OAuth (admin login)
1. **Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID → Web.**
2. **Authorized JavaScript origins** — your *app* origin(s), scheme + host only, **no path**:
   - `https://knovo.ai` and `https://www.knovo.ai` (prod)
   - `http://localhost:3000` (local dev)
   - This field is only load-bearing for Google's in-browser SDK (One Tap / the nonce-based
     button). The standard Supabase redirect login does **not** depend on it, but the
     Supabase docs still say to add the app URL here — so add it and move on. Do **not** put
     the `…supabase.co/...` URL here.
3. **Authorized redirect URIs** — the *Supabase* callback (Supabase performs the exchange):
   `https://<project-ref>.supabase.co/auth/v1/callback`
   (use the **dev** ref for the dev client, the **prod** ref for the prod client).
4. Copy the client ID + secret.
5. **Supabase dashboard → Authentication → Providers → Google:** enable, paste client ID +
   secret, save. (Do this on **both** the dev and prod projects with their respective clients.)
6. **Authentication → URL Configuration:**
   - **Site URL:** set to your **canonical** host. Because Vercel redirects the apex to `www`
     (see §5), the canonical host is **`https://www.knovo.ai`** — set the Site URL to that, not
     the bare apex, so post-login redirects don't take an extra 301 hop.
   - **Redirect URLs (allow-list):** entries must match the *redirect destination* path, so use
     path wildcards, not bare origins:
     `https://www.knovo.ai/**`, `https://knovo-ai.vercel.app/**`, `http://localhost:3000/**`.
     A bare `https://www.knovo.ai` will **not** match `/auth/callback` and login will fail.
7. Put the client ID/secret in `.env.local` / Vercel env (kept for lockstep/documentation).

The app route `app/auth/callback/route.ts` exchanges the code for a session and redirects
to `/admin`.

## 4. Make yourself an admin
A profile row is auto-created on first sign-in (default role `viewer`). After signing in
once, grant admin in the Supabase **SQL editor** (dev project):
```sql
update public.profiles set role = 'admin' where email = 'YOU@example.com';
```

## 5. Vercel (deploy time)
Set env vars in the Vercel project (Production → **prod** Supabase values; Preview/Dev →
**dev**). `SUPABASE_SERVICE_ROLE_KEY` is **server-only** — never prefix `NEXT_PUBLIC_`.
Note: Vercel **Hobby** is non-commercial; moving to ads/paid requires **Pro**.

**Domain.** `knovo.ai` is the production domain with **apex → `www` redirect** enabled, so
`https://www.knovo.ai` is the **canonical** host. Keep this consistent everywhere:
- Supabase **Site URL** = `https://www.knovo.ai` (see §3.6).
- Google OAuth **JavaScript origins** include both apex and `www` (see §3.2).
- The Google **Branding** privacy/terms links use the apex (`https://knovo.ai/legal/...`);
  those 301 to `www`, which is fine for verification.

## 6. The governed worker API (`api.knovo.ai`)
*(Governed-autonomy pivot, 2026-06-22.)* Workers write **only** through the Knovo API; the old
`knovo_routine` DB role was dropped in migration `0004`.

1. **Vercel domain.** `api.knovo.ai` is CNAME'd to Vercel — add it as a domain on the Knovo
   Vercel project (same app). `middleware.ts` host-routes `api.knovo.ai/<path>` →
   `/api/worker/<path>`.
2. **Worker tokens.** Generate three long random secrets (`openssl rand -hex 32`):
   - `KNOVO_WORKER_TOKEN_SCOUT`, `KNOVO_WORKER_TOKEN_EDITOR`, `KNOVO_WORKER_TOKEN_KEEPER`.
   Set them in the **Vercel env** (so the API can verify) — server-only, never `NEXT_PUBLIC_`.
3. **Routine fire (dashboard "run now").** After creating each routine (step 7), add an **API
   trigger** and copy its URL + `sk-ant-oat01-…` token into Vercel env as
   `ROUTINE_SCOUT_FIRE_URL`/`ROUTINE_SCOUT_TOKEN`, `ROUTINE_EDITOR_FIRE_URL`/`ROUTINE_EDITOR_TOKEN`,
   and `ROUTINE_KEEPER_FIRE_URL`/`ROUTINE_KEEPER_TOKEN`. `KNOVO_API_BASE = https://api.knovo.ai`.

The API uses `SUPABASE_SERVICE_ROLE_KEY` server-side and enforces zod validation, the
admin-directed publish gate, audit logging, and soft-delete. Never give a worker the
service-role key or the Supabase connector.

## 7. The routine cloud environment + the three routines (Claude web app)
Workers run as **routines** in the Claude web app, sharing one **cloud environment** named
**"Knovo"**. Create the environment once, then attach it to all three routines. Background:
https://code.claude.com/docs/en/claude-code-on-the-web

### 7a. Create the shared "Knovo" cloud environment
1. Go to **claude.ai/code → Environments → New environment**.
2. **Name:** `Knovo`.
3. **Repository / source:** select the **Knovo** repo (gives workers repo context for skills;
   they never push code).
4. **Network access → Custom (allowlist):** `api.knovo.ai`, `data.rcsb.org`, `files.rcsb.org`.
   (MCP connector traffic is routed through Anthropic and needs no allowlisting.)
5. **Environment variables** — the routine-side values the workers send to the governed API.
   Add each as a variable on the environment:

   | Variable | Value |
   |---|---|
   | `KNOVO_API_BASE` | `https://api.knovo.ai` |
   | `KNOVO_WORKER_TOKEN_SCOUT` | same secret set in Vercel (§6.2) |
   | `KNOVO_WORKER_TOKEN_EDITOR` | same secret set in Vercel (§6.2) |
   | `KNOVO_WORKER_TOKEN_KEEPER` | same secret set in Vercel (§6.2) |

   Each token MUST equal the value Vercel verifies against (§6.2); the API verb-scopes each token
   (`docs/routines.md`). **Never** put the Supabase service-role key (or any DB credential) here.
6. Save. The "Knovo" environment is now selectable when creating each routine.

### 7b. Create the three routines
In **claude.ai/code → Routines**, create **Scout**, **Editor**, and **Keeper** per
`docs/routines.md` (names + paste-ready instructions). For each routine:
- **Environment:** select **Knovo** (from §7a) so it inherits the network policy + env vars.
- **Connectors:** Scout & Keeper = bioRxiv/ChEMBL/PubMed; Editor = + tldraw; remove all others
  (especially Supabase).
- **Triggers:** Scout = Schedule (daily) + API; Editor = API (+ optional hourly sweep);
  Keeper = Schedule (weekly) + API.
- **API trigger token:** add an API trigger, then copy its URL + `sk-ant-oat01-…` token into the
  Vercel env as `ROUTINE_{SCOUT,EDITOR,KEEPER}_FIRE_URL` / `_TOKEN` (§6.3) so the dashboard
  "run now" can fire it.

Whenever the schema/connectors/flow change, regenerate `docs/routines.md` and re-paste.

## Migrations
SQL lives in `supabase/migrations/` (`0001`–`0004`). Apply new migrations to **dev first, then
prod**, keep both in sync, and regenerate `lib/database.types.ts` after schema changes.

**Apply `0004` via the Supabase dashboard** (works without the CLI):
1. Open the **dev** project (`knovo-dev`, ref `hgsgnaeevqviwagepgsw`) → **SQL Editor** → **New
   query**.
2. Paste the entire contents of `supabase/migrations/0004_editorial_workflow.sql` and click
   **Run**. It should report success (it adds the enum values, new tables, RLS, and drops the old
   `knovo_routine` role).
   - *If* you get `ALTER TYPE ... ADD VALUE cannot run inside a transaction block`, run the four
     `alter type public.artifact_status add value …` lines **first** (one query), then run the
     rest of the file.
3. Repeat exactly on the **prod** project (`knovo-prod`, ref `flltjufyzbxicnpqpuij`).
4. **Verify** (either project): Table Editor shows `series`, `comments`, `revisions`, `audit_log`;
   **Advisors → Security** shows no new errors. (Optional: `select unnest(enum_range(null::public.directive_action));`
   lists the 8 actions.)
5. Tell me when it's applied and I'll regenerate `lib/database.types.ts` from the live schema and
   run the worker-API smoke test.
