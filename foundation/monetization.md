# Monetization (GemBlog freemium model)

*(Recorded 2026-06-23. **Vision, not current scope.** Decision 7 — "no monetization/payments at MVP"
— is **frozen**; this records the intended model for the GemBlog platform so it is designed
consciously when the roadmap "Platform horizon" milestone (M6) is pulled. Nothing here is built.
Scope-wall per `CLAUDE.md` invariant #6. Framing: `vision.md`; tenancy: `data-model.md` →
"Multi-tenant data model"; deployment: `deployment.md` → "Platform horizon".)*

## The offer
GemBlog productizes the engine as **an autonomous, source-grounded editorial team that runs your
niche blog**: Scout/Editor/Keeper (+ the Supervisor) draft interactive, citation-grounded artifacts
on a cadence; a human gate keeps publishing under the operator's control. The freemium wedge is *try
it free on a gemblog.co subdomain; pay to scale, own your domain, and run it hands-off*.

## Tiers (sketch — exact limits TBD; see open questions)
| Tier | Domain | Generation quota | Workers / cadence | Other |
|---|---|---|---|---|
| **Free** | `‹name›.gemblog.co` (provisioned by default) | DB-level daily/monthly cap | limited workers; manual/scheduled | public library, RSS, reader accounts |
| **Pro** | + custom/vanity domain (`blog.you.com`) | higher / unmetered | more workers + the **autonomous Supervisor** cadence | private drafts, priority dispatch |
| **Enterprise** | multiple domains | unmetered | multi-niche, multiple harnesses | SLA, support, audit export |

The defining free→paid unlocks: **custom domains**, **higher quotas**, and the **hands-off Supervisor
cadence** (`worker-harness.md` §5).

## Quota mechanism (sketch)
Enforced at the **governed-API boundary** — the existing single write path is the correct chokepoint
(a worker cannot bypass it; the DB is never touched directly).
- **Plan + limits on the tenant row** (`tenants.plan`, `tenants.‹limit›`; see `data-model.md`).
- **`usage_tracking(tenant_id, period, counts…)`** incremented on each governed create; a create
  beyond the cap returns **`429 quota_exceeded`** from the API (same error envelope as today's worker
  API). Period = calendar day/month; per-tenant (per-worker caps are an open question).
- Because publishing already flows through the API + the admin gate, no separate metering surface is
  needed — quotas pigg-back on the write boundary that already exists.

## Custom / vanity domains (sketch)
- Free tenants get `‹slug›.gemblog.co` (wildcard subdomain) automatically.
- Pro tenants add a custom domain stored on `tenants.domain` (+ `domain_verified_at`); operator points
  a CNAME at the Vercel project; **`middleware.ts` host-routing** (today only `api.knovo.ai`) resolves
  the tenant from the request host. Cert/verification flow is an open question.

## Billing & hosting
- **Payments** (Stripe/Paddle) are a separate, high-risk integration — its own PR, not folded into the
  tenancy work. Plan changes flip `tenants.plan` and the enforced limits.
- **Vercel tier:** the **Hobby tier is non-commercial** (`deployment.md`); the moment GemBlog carries
  paid features it must move to **Pro**. Flagged so the tier decision is explicit at M6.

## Decision posture
All of the above is **gated by Decision 7** and recorded only. When M6 is pulled, expect an amendment
to **Decision 7** (no monetization → freemium tiers) made consciously at phase start; until then,
propose-and-ask applies.

## Open questions
- **Free-tier limits** — daily vs monthly; per-tenant vs per-worker; the exact numbers. *Trigger:*
  starting M6 / a pricing pass.
- **First paid features** — which unlock leads (custom domain vs quota vs Supervisor cadence).
  *Trigger:* first paying-intent signal.
- **Payment provider** — Stripe vs Paddle (merchant-of-record/VAT handling). *Trigger:* building
  billing.
- **Custom-domain flow** — DNS verification + TLS cert issuance + collision handling. *Trigger:* first
  Pro custom domain.
