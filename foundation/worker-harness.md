# Worker harness

How Knovo's Claude **routine workers** are configured, coordinated, and (in the future) made
customizable — and how that same structure becomes the per-tenant unit of the multi-tenant
**north star** in `vision.md`. This doc is the canonical design; `docs/routines.md` stays the
canonical *paste-ready instructions*, and `agent-architecture.md` describes what the workers do.

> **Status (2026-06-23).** This is a **design spec**. Today Knovo runs **three** content workers
> (Scout / Editor / Keeper) with static prompts and **no repo writes** (the repo is read-only
> context). The read-write coordination, the **Supervisor** routine, the parametric-prompt
> composer, and multi-tenancy are **designed here, not yet implemented** — recorded per the
> scope-wall (`CLAUDE.md` invariant #6). Sections below mark what is live vs. future.

## 1. The data path is the API; the repo is context (live)
Workers reach Knovo data **only through the governed Knovo API** (`api.knovo.ai`, per-worker
bearer token) plus their research MCP connectors and the public RCSB REST API — **never** the
database, never the Supabase connector (Decisions 2/4/6; `agent-architecture.md`). Content truth
lives in Postgres behind that API.

The repository a routine selects is a **separate concern**: it is cloned into the worker's
session as **context/memory**, not as the content store. It is **not** the Knovo app repo —
that repo's `CLAUDE.md` is about *building Knovo* and is noise for a content worker. Each routine
should point at a **dedicated worker-harness repo**.

## 2. The harness repo (live: read-only · future: read-write)
A small, dedicated repo that carries the workers' shared context and per-worker memory. Knovo
ships a **public baseline** harness that anyone can use as-is or **fork** to customize — it
doubles as the open-source exemplar and, later, as the per-tenant template instance (§8).

```
knovo-worker-harness/            ← selected as each routine's repo
  AGENTS.md                      ← the constitution (loads for every worker at startup)
  CLAUDE.md                      ← @imports AGENTS.md (Claude-Code-native entry point)
  CALENDAR.md                    ← shared editorial backlog / hand-offs (supervisor-owned)
  scout/    CLAUDE.md  notes/    ← Scout's playbook + append-only memory
  editor/   CLAUDE.md  notes/    ← Editor's playbook + append-only memory
  keeper/   CLAUDE.md  notes/    ← Keeper's playbook + append-only memory
  supervisor/ CLAUDE.md         ← the coordinator's playbook (4th routine; §5)
```

- **`AGENTS.md` (the constitution)** — niche + voice, the slot-schema cheat-sheet, the
  governed-API contract (endpoints/verbs), and the coordination protocol (§4). It is the one
  shared, top-level layer every worker reads. `CLAUDE.md` simply `@import`s it so the repo works
  whether the routine session keys off `AGENTS.md` or `CLAUDE.md`.
- **Per-worker subfolders** — each holds that worker's `CLAUDE.md` playbook and an append-only
  `notes/` memory (run logs, findings, hand-off notes). Subfolder memory **lazy-loads** when the
  worker reads its own folder; the top-level constitution loads at session start. Subfolder files
  extend/override ancestors.

## 3. What lives in git vs. the database (design)
The two stores never overlap:

| In the **database** (via the API) | In the **harness repo** (git) |
|---|---|
| Artifacts, sources, revisions, audit, queue | Editorial **strategy** and the idea backlog |
| Dedup/seen/rejected state, review-targets | Per-run **reasoning**, lessons, what-not-to-redraft notes |
| Status/lifecycle, directives | Cross-worker **hand-offs** + the shared calendar |

Rule of thumb: **content truth → API/DB; the workers' thinking and coordination → git.** A worker
never stores content in git, and never stores strategy notes in the DB.

## 4. Coordination model — constitution + scoped read-write (design)
The hard problem with multiple workers sharing one repo is **write races**. The model avoids them
by construction:

- **Read anywhere, write only your own subfolder.** Every worker may *read* the whole harness, but
  *writes* go only into its own `‹worker›/notes/` (append-only). No two content workers ever write
  the same path → no merge races between them.
- **One writer for the shared layer.** The top-level constitution and `CALENDAR.md` are written by
  exactly one actor — the **Supervisor** (§5) — which reconciles the workers' subfolder notes into
  the shared layer. Because there is a single writer of the shared files, the shared layer also
  never races.

This is "constitution + read-write coordination": a stable shared constitution, per-worker scoped
writes, and a supervisor that folds the parts back into the whole.

## 5. The Supervisor — the 4th member of the editorial team (design)
The editorial team is **Scout / Editor / Keeper / Supervisor**. The first three author content;
the Supervisor authors **nothing into the database** — its job is pure **git coordination** of the
harness:

```
read every ‹worker›/notes/  →  reconcile into AGENTS.md + CALENDAR.md  →  commit & push
```

- **Distinct kind of routine, least privilege.** It is set up like any routine (Claude web app →
  select the **same harness repo** → paste its prompt → choose a trigger), but its shared
  environment carries **no `KNOVO_WORKER_TOKEN`** — it has **zero content-write power**. If it ever
  needs to glance at library/queue state it gets at most a **read-only** token. The only routine
  that writes the shared layer is the one that cannot touch content.
- **Triggering — three modes, the admin's choice:**
  1. **Schedule** (cron) — simplest; reconciles on a clock, ideally *after* the content workers'
     cadence so it sweeps settled notes.
  2. **GitHub Event** (recommended default) — the Claude routines UI natively supports GitHub-event
     triggers (`push`, `pull request`, etc., with filters). Point the Supervisor at a **push** to
     the harness repo (or `PR merged` if workers land notes via PRs): a worker writes a note → the
     push wakes the Supervisor → it reconciles. Event-driven, no idle runs, near-real-time shared
     memory.
  3. **Manual fire URL** — register the Supervisor's API fire URL in `/admin/settings` like the
     content workers so the admin can "run sync now" from the HUD.
- **Concurrency caveat (for the GitHub-event mode).** Two workers pushing within seconds can spawn
  two Supervisor runs that both try to write the shared layer. The Supervisor therefore **must
  `git pull --rebase` before it writes/pushes**, and may use a GitHub Actions–style concurrency
  group to serialize runs. A GitHub *push* event is decoupled/async — this is **not** the
  synchronous "worker calls the Supervisor's fire URL mid-run" anti-pattern, which we still avoid.
  The fire URL is **not** the content API; the Supervisor never writes content through it.
- **Why a Claude routine and not a plain GitHub Action.** Reconciliation is *prose-merging* three
  workers' free-text notes into a coherent calendar and constitution — that wants an LLM. A
  deterministic GitHub Action is the fallback only for a purely mechanical sweep.

## 6. How a worker loads the harness (future prompt hook)
When read-write coordination ships, each worker's system prompt gains a short preamble: *"Your home
is `‹worker›/`. Read the top-level `AGENTS.md` and your own subfolder first; append your run notes
to `‹worker›/notes/`; never write outside your subfolder."* This is the only prompt change the
harness requires — and it is **deferred** (the current three prompts in `docs/routines.md` /
`lib/workers/routines.ts` are unchanged until then).

## 7. Modular / parametric routine prompts (future)
Today each worker's prompt is a single static, paste-ready block (`lib/workers/routines.ts`,
mirrored byte-for-byte to `docs/routines.md`, drift-guarded by `lib/workers/routines.test.ts`). The
long-term model makes a prompt **composed** rather than frozen:

```
prompt = compose(domainTemplate, workerRoleModule, adminParams)
```

- **`domainTemplate`** — the niche layer (Knovo = molecular science; other domains later, §8).
- **`workerRoleModule`** — the base behavior for scout / editor / keeper / supervisor.
- **`adminParams`** — per-worker knobs the admin sets in `/admin/settings`, stored in a new
  `routine_configs.params jsonb` (extending the `0008` table). They tune **both** sides of a team
  member's job:
  - *Editorial (API) behavior* — added capabilities/responsibilities, source-set, dedup strictness,
    style/voice/flow variants, cadence/volume.
  - *Harness (repo) behavior* — the owned subfolder, whether it writes hand-off notes, and its
    **trigger** (schedule | github-event | manual). The Supervisor's GitHub-event trigger is then
    just one parameter value.

Settings would regenerate the paste-ready block live from the chosen params, so the operator copies
a prompt tailored to their setup. The drift test evolves from "byte-match a static string" to "the
composer's **default** params reproduce the canonical block in `docs/routines.md`." All of this is
**deferred**; nothing about the static prompts or the drift test changes in the PR that introduces
this doc.

## 8. Template-readiness → the multi-tenant bridge (future)
A harness repo is the per-tenant/per-domain **template instance**. A full template pairs it with a
**domain kit** (the niche's stage kinds + source vocabulary + voice; `artifact-schema.md` →
"Generalization") and a **shared environment** (allowlist + env + connector set): *template = harness
+ domain kit + env*. The multi-tenant north star — **GemBlog** (`vision.md`) — is then "a registry of
these templates": Knovo's molecular-science template is the showcase; new domains add their own
(their kit + harness + env); a tenant **forks the baseline** and selects their repo when configuring
routines, running at `‹slug›.gemblog.co` under the freemium model (`monetization.md`). Nothing here is
built now — it is recorded so the harness is shaped to make it possible.

## Open questions
- **Supervisor trigger default** — schedule vs github-event vs manual, and whether it ever needs a
  read-only token vs none at all. *Trigger:* implementing read-write coordination.
- **GitHub-event concurrency** — rebase-before-write alone, or a concurrency group / debounce.
  *Trigger:* first observed double-run race.
- **Parametric composer shape** — does it **replace** the static blocks or **layer** as optional
  overrides while defaults stay static, and what is the `params jsonb` schema / first param set.
  *Trigger:* starting the composer milestone (roadmap "Platform horizon" M3).
- **Public vs private baseline** — is the shipped baseline harness public (open-source exemplar) or
  a private template each tenant clones. *Trigger:* publishing the baseline repo.
- **Supervisor as a registered routine** — does it get a 4th fire-URL row in `/admin/settings`
  (and a 4th `routine_configs.worker` value). *Trigger:* wiring the Supervisor.
