# SETUP — Knovo (Phase 0)

How to run Knovo locally and finish the Phase 0 wiring. Supabase **dev** and **prod**
projects already exist (created via MCP) with the schema + RLS applied. What remains is
local env, Google OAuth, the admin grant, and (later) the routine credential.

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

## 6. The autonomous routine credential (remaining wiring — tracked in BACKLOG.md)
The migration defines a least-privilege `knovo_routine` Postgres role (INSERT-only on
drafts/sources/links; no update/delete/publish). Connecting the Claude routine's Supabase
access to this role — instead of the service-role key — is the open wiring step. Until then,
the publish-gate guarantee is enforced by the RLS policies; do **not** give the routine the
service-role key. The routine instructions live in `docs/routines.md`.

## Migrations
SQL lives in `supabase/migrations/`. Apply new migrations to **dev first, then prod**, and
keep both projects in sync. Regenerate `lib/database.types.ts` after schema changes.
