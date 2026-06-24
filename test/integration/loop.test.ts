import { beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Worker route handlers — invoked directly with constructed Request objects. This runs the exact
// governance code the HTTP layer runs (token auth, verb scoping, zod validation, dedup, the publish
// gate, audit, revisions) against a real local Supabase, with no Next server in the loop.
import { POST as createArtifact } from "@/app/api/worker/artifacts/route";
import { POST as workerDedup } from "@/app/api/worker/dedup/route";
import { PATCH as patchArtifact } from "@/app/api/worker/artifacts/[id]/route";
import { POST as setWorkerStatus } from "@/app/api/worker/artifacts/[id]/status/route";
import { POST as flagArtifact } from "@/app/api/worker/artifacts/[id]/flag/route";
import { POST as resolveComment } from "@/app/api/worker/comments/[id]/resolve/route";
import { GET as reviewTargets } from "@/app/api/worker/review-targets/route";

// ── Config (from .env.local, loaded by test/integration/load-env.ts) ─────────────────────────
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SCOUT = process.env.KNOVO_WORKER_TOKEN_SCOUT;
const EDITOR = process.env.KNOVO_WORKER_TOKEN_EDITOR;
const KEEPER = process.env.KNOVO_WORKER_TOKEN_KEEPER;

const MISSING = Object.entries({
  NEXT_PUBLIC_SUPABASE_URL: URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: ANON,
  SUPABASE_SERVICE_ROLE_KEY: SERVICE,
  KNOVO_WORKER_TOKEN_SCOUT: SCOUT,
  KNOVO_WORKER_TOKEN_EDITOR: EDITOR,
  KNOVO_WORKER_TOKEN_KEEPER: KEEPER,
})
  .filter(([, v]) => !v)
  .map(([k]) => k);

// Unique per-run identifiers so the dedup views (which accumulate across runs) never collide.
const RUN = Date.now().toString(36);
const ADMIN_EMAIL = `itest-admin-${RUN}@knovo.local`;
const VIEWER_EMAIL = `itest-viewer-${RUN}@knovo.local`;
const PASSWORD = "itest-password-1234";

let svc: SupabaseClient<Database>;
let adminId = "";
let viewerId = "";

// Shared loop state (it-blocks run sequentially within a file).
const a1 = { id: "", slug: "", primary: `ITEST-${RUN}-A1` }; // happy path → published
const a2 = { id: "", slug: "", primary: `ITEST-${RUN}-A2` }; // reject path
const a3 = { id: "", slug: "", primary: `ITEST-${RUN}-A3` }; // approve → Keeper → soft-delete

function anon() {
  return createClient<Database>(URL!, ANON!, { auth: { persistSession: false, autoRefreshToken: false } });
}

// ── Worker-API callers (direct handler dispatch) ─────────────────────────────────────────────
type Res = { status: number; body: Record<string, unknown> };
async function call(
  handler: (req: Request, ctx: { params: { id: string } }) => Promise<Response>,
  opts: { token?: string; method?: string; url?: string; body?: unknown; id?: string },
): Promise<Res> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  const init: RequestInit = { method: opts.method ?? "POST", headers };
  if (opts.body !== undefined) init.body = JSON.stringify(opts.body);
  const req = new Request(opts.url ?? "http://itest/api/worker", init);
  // Every handler accepts (req) or (req, {params}); passing an unused ctx is harmless.
  const res = await handler(req, { params: { id: opts.id ?? "" } });
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

// ── Fixtures ─────────────────────────────────────────────────────────────────────────────────
function chartDoc(title: string) {
  return {
    schemaVersion: 1,
    title,
    summary: "Integration-test artifact — synthetic data; never reaches the real public site.",
    stage: {
      id: "stage",
      kind: "chart",
      chartType: "bar",
      axes: { x: "target", y: "value" },
      series: [{ name: "series", data: [{ target: "A", value: 1 }, { target: "B", value: 2 }] }],
    },
    panels: [{ id: "note", kind: "prose", content: "Integration test." }],
    controls: [],
    captions: [],
  };
}
function primarySource(uid: string) {
  return {
    db: "pubmed" as const,
    uid,
    url: `https://pubmed.ncbi.nlm.nih.gov/${uid}/`,
    title: "Integration test source",
    role: "primary" as const,
    citation_text: `Synthetic integration-test source ${uid}.`,
  };
}

// ── Admin-side writes (mirror lib/admin/actions.ts, which writes via service role after a
//    requireAdmin() session check — so this is the real production write path). ────────────────
async function addDirective(
  artifactId: string,
  d: { action?: Database["public"]["Enums"]["directive_action"] | null; publishAfter?: boolean; note?: string },
): Promise<string> {
  const { data, error } = await svc
    .from("comments")
    .insert({
      artifact_id: artifactId,
      author: adminId,
      note: d.note ?? null,
      action: d.action ?? null,
      publish_after: d.publishAfter ?? false,
      status: "open",
    })
    .select("id")
    .single();
  if (error) throw new Error(`addDirective: ${error.message}`);
  return data.id;
}
async function adminSetStatus(artifactId: string, to: Database["public"]["Enums"]["artifact_status"], reason?: string) {
  const now = new Date().toISOString();
  const patch: Database["public"]["Tables"]["artifacts"]["Update"] = { status: to, reviewed_by: adminId, reviewed_at: now };
  if (to === "published") patch.published_at = now;
  if (to === "rejected") patch.rejected_reason = reason ?? null;
  const { error } = await svc.from("artifacts").update(patch).eq("id", artifactId);
  if (error) throw new Error(`adminSetStatus: ${error.message}`);
}
async function adminSetDeleted(artifactId: string, deleted: boolean) {
  const { error } = await svc
    .from("artifacts")
    .update({ deleted_at: deleted ? new Date().toISOString() : null })
    .eq("id", artifactId);
  if (error) throw new Error(`adminSetDeleted: ${error.message}`);
}

// ── Assertions helpers ───────────────────────────────────────────────────────────────────────
async function auditActions(artifactId: string): Promise<string[]> {
  const { data } = await svc.from("audit_log").select("action").eq("artifact_id", artifactId);
  return (data ?? []).map((r) => r.action);
}
async function revisionCount(artifactId: string): Promise<number> {
  const { count } = await svc.from("revisions").select("id", { count: "exact", head: true }).eq("artifact_id", artifactId);
  return count ?? 0;
}
async function publicGet(slug: string) {
  const { data } = await anon()
    .from("artifacts")
    .select("id, slug, status")
    .match({ status: "published" })
    .is("deleted_at", null)
    .eq("slug", slug)
    .maybeSingle();
  return data;
}

beforeAll(async () => {
  if (MISSING.length) {
    throw new Error(
      `Local Supabase env not configured (missing: ${MISSING.join(", ")}). ` +
        `Run \`supabase start\` and create .env.local — see docs/operational-validation.md.`,
    );
  }
  svc = createClient<Database>(URL!, SERVICE!, { auth: { persistSession: false, autoRefreshToken: false } });

  // Fail fast & clearly if the stack isn't reachable / migrations not applied.
  const { error: ping } = await svc.from("artifacts").select("id").limit(1);
  if (ping) {
    throw new Error(
      `Local Supabase not reachable or migrations not applied (${ping.message}). ` +
        `Run \`supabase start\` (applies supabase/migrations/*) — see docs/operational-validation.md.`,
    );
  }

  // Seed an admin and a viewer (idempotent). handle_new_user() creates a viewer profile on insert;
  // we then promote the admin via service role.
  const ensure = async (email: string, role: Database["public"]["Enums"]["user_role"]): Promise<string> => {
    const { data: created, error } = await svc.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
    let id = created?.user?.id;
    if (error || !id) {
      const { data: list } = await svc.auth.admin.listUsers();
      id = list?.users?.find((u) => u.email === email)?.id;
      if (!id) throw new Error(`could not create or find user ${email}: ${error?.message}`);
    }
    const { error: upErr } = await svc.from("profiles").update({ role }).eq("id", id);
    if (upErr) throw new Error(`promote ${email}: ${upErr.message}`);
    return id;
  };
  adminId = await ensure(ADMIN_EMAIL, "admin");
  viewerId = await ensure(VIEWER_EMAIL, "viewer");
});

describe("governed loop (local Supabase)", () => {
  it("is_admin() reflects role: true for the admin, false for the viewer", async () => {
    const aClient = anon();
    expect((await aClient.auth.signInWithPassword({ email: ADMIN_EMAIL, password: PASSWORD })).error).toBeNull();
    expect(await aClient.rpc("is_admin").then((r) => r.data)).toBe(true);

    const vClient = anon();
    expect((await vClient.auth.signInWithPassword({ email: VIEWER_EMAIL, password: PASSWORD })).error).toBeNull();
    expect(await vClient.rpc("is_admin").then((r) => r.data)).toBe(false);
    expect(viewerId).not.toBe("");
  });

  it("Scout: dedup is clean, then creates a source-grounded draft (provenance + revision + audit)", async () => {
    const pre = await call(workerDedup as never, { token: SCOUT, url: "http://itest/api/worker/dedup", body: { sources: [{ db: "pubmed", uid: a1.primary }] } });
    expect(pre.status).toBe(200);
    expect((pre.body.results as { seen: boolean; rejected: boolean }[])[0]).toMatchObject({ seen: false, rejected: false });

    const res = await call(createArtifact as never, { token: SCOUT, url: "http://itest/api/worker/artifacts", body: { doc: chartDoc("ITEST happy-path artifact"), sources: [primarySource(a1.primary)] } });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("draft");
    a1.id = res.body.id as string;
    a1.slug = res.body.slug as string;

    const { data: row } = await svc.from("artifacts").select("status, last_worker").eq("id", a1.id).single();
    expect(row?.status).toBe("draft");
    expect(row?.last_worker).toBe("worker:scout");
    const { count: srcLinks } = await svc.from("artifact_sources").select("source_id", { count: "exact", head: true }).eq("artifact_id", a1.id);
    expect(srcLinks).toBe(1);
    expect(await revisionCount(a1.id)).toBe(1); // initial draft snapshot
    expect(await auditActions(a1.id)).toContain("create_draft");
  });

  it("dedup blocks re-drafting the same primary source (seen → 409)", async () => {
    const dedup = await call(workerDedup as never, { token: SCOUT, url: "http://itest/api/worker/dedup", body: { sources: [{ db: "pubmed", uid: a1.primary }] } });
    expect((dedup.body.results as { seen: boolean }[])[0].seen).toBe(true);

    const dup = await call(createArtifact as never, { token: SCOUT, url: "http://itest/api/worker/artifacts", body: { doc: chartDoc("dup"), sources: [primarySource(a1.primary)] } });
    expect(dup.status).toBe(409);
    expect(dup.body.error).toMatchObject({ code: "duplicate_source" });
  });

  it("rejects a schema-escaping document at the boundary (422)", async () => {
    const bad = { schemaVersion: 1, title: "no stage", summary: "x", panels: [], controls: [], captions: [] };
    const res = await call(createArtifact as never, { token: SCOUT, url: "http://itest/api/worker/artifacts", body: { doc: bad, sources: [primarySource(`ITEST-${RUN}-BAD`)] } });
    expect(res.status).toBe(422);
    expect(res.body.error).toMatchObject({ code: "invalid_document" });
  });

  it("enforces verb scoping over the API (Keeper cannot create → 403)", async () => {
    const res = await call(createArtifact as never, { token: KEEPER, url: "http://itest/api/worker/artifacts", body: { doc: chartDoc("x"), sources: [primarySource(`ITEST-${RUN}-K`)] } });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatchObject({ code: "forbidden" });
  });

  it("blocks publishing without admin authorization (403)", async () => {
    const res = await call(setWorkerStatus as never, { token: EDITOR, id: a1.id, url: "http://itest/api/worker/artifacts/x/status", body: { to: "published" } });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatchObject({ code: "publish_not_authorized" });
  });

  it("admin directs publish_after → Editor iterates (new revision) and publishes; then resolves", async () => {
    const directiveId = await addDirective(a1.id, { publishAfter: true, note: "Looks good — publish when ready." });

    const beforeRevs = await revisionCount(a1.id);
    const patch = await call(patchArtifact as never, { token: EDITOR, method: "PATCH", id: a1.id, url: "http://itest/api/worker/artifacts/x", body: { doc: chartDoc("ITEST happy-path artifact (revised)"), note: "tightened summary" } });
    expect(patch.status).toBe(200);
    expect(await revisionCount(a1.id)).toBe(beforeRevs + 1);

    const pub = await call(setWorkerStatus as never, { token: EDITOR, id: a1.id, url: "http://itest/api/worker/artifacts/x/status", body: { to: "published" } });
    expect(pub.status).toBe(200);
    const { data: row } = await svc.from("artifacts").select("status, published_at").eq("id", a1.id).single();
    expect(row?.status).toBe("published");
    expect(row?.published_at).toBeTruthy();
    expect(await auditActions(a1.id)).toEqual(expect.arrayContaining(["status:published"]));

    const resolved = await call(resolveComment as never, { token: EDITOR, id: directiveId, url: "http://itest/api/worker/comments/x/resolve", body: { disposition: "addressed" } });
    expect(resolved.status).toBe(200);
  });

  it("published artifact is publicly readable (anon RLS); a fresh draft is not", async () => {
    expect(await publicGet(a1.slug)).toMatchObject({ slug: a1.slug, status: "published" });

    const draft = await call(createArtifact as never, { token: SCOUT, url: "http://itest/api/worker/artifacts", body: { doc: chartDoc("ITEST hidden draft"), sources: [primarySource(`ITEST-${RUN}-DRAFT`)] } });
    expect(draft.status).toBe(201);
    expect(await publicGet(draft.body.slug as string)).toBeNull();
  });

  it("editing a published artifact requires an open edit directive (403 → 200)", async () => {
    const blocked = await call(patchArtifact as never, { token: EDITOR, method: "PATCH", id: a1.id, url: "http://itest/api/worker/artifacts/x", body: { doc: chartDoc("ITEST edit without directive") } });
    expect(blocked.status).toBe(403);
    expect(blocked.body.error).toMatchObject({ code: "needs_directive" });

    const directiveId = await addDirective(a1.id, { action: "revise", note: "Fix the caption." });
    const allowed = await call(patchArtifact as never, { token: EDITOR, method: "PATCH", id: a1.id, url: "http://itest/api/worker/artifacts/x", body: { doc: chartDoc("ITEST edit with directive") } });
    expect(allowed.status).toBe(200);
    await call(resolveComment as never, { token: EDITOR, id: directiveId, url: "http://itest/api/worker/comments/x/resolve", body: { disposition: "addressed" } });
  });

  it("reject path: a rejected primary source is not re-drafted (409 rejected_source)", async () => {
    const created = await call(createArtifact as never, { token: SCOUT, url: "http://itest/api/worker/artifacts", body: { doc: chartDoc("ITEST reject path"), sources: [primarySource(a2.primary)] } });
    expect(created.status).toBe(201);
    a2.id = created.body.id as string;

    await adminSetStatus(a2.id, "rejected", "out of scope");

    const dedup = await call(workerDedup as never, { token: SCOUT, url: "http://itest/api/worker/dedup", body: { sources: [{ db: "pubmed", uid: a2.primary }] } });
    expect((dedup.body.results as { rejected: boolean }[])[0].rejected).toBe(true);

    const redraft = await call(createArtifact as never, { token: SCOUT, url: "http://itest/api/worker/artifacts", body: { doc: chartDoc("ITEST re-draft of rejected"), sources: [primarySource(a2.primary)] } });
    expect(redraft.status).toBe(409);
    expect(redraft.body.error).toMatchObject({ code: "rejected_source" });
  });

  it("approve path + Keeper: admin approves, Editor publishes, Keeper sweeps and flags drift", async () => {
    const created = await call(createArtifact as never, { token: SCOUT, url: "http://itest/api/worker/artifacts", body: { doc: chartDoc("ITEST keeper target"), sources: [primarySource(a3.primary)] } });
    expect(created.status).toBe(201);
    a3.id = created.body.id as string;
    a3.slug = created.body.slug as string;

    await adminSetStatus(a3.id, "approved"); // admin owns 'approved'
    const pub = await call(setWorkerStatus as never, { token: EDITOR, id: a3.id, url: "http://itest/api/worker/artifacts/x/status", body: { to: "published" } });
    expect(pub.status).toBe(200); // publishAuthorized via current status === 'approved'

    const sweep = await call(reviewTargets as never, { token: KEEPER, method: "GET", url: "http://itest/api/worker/review-targets?limit=50" });
    expect(sweep.status).toBe(200);
    expect((sweep.body.items as { id: string }[]).map((i) => i.id)).toContain(a3.id);

    const flag = await call(flagArtifact as never, { token: KEEPER, id: a3.id, url: "http://itest/api/worker/artifacts/x/flag", body: { note: "Cited source shows a correction notice.", severity: "warn" } });
    expect(flag.status).toBe(201);
    const { data: openComment } = await svc.from("comments").select("action, publish_after, status").eq("artifact_id", a3.id).eq("status", "open").maybeSingle();
    expect(openComment).toMatchObject({ action: null, publish_after: false, status: "open" });
    expect(await auditActions(a3.id)).toEqual(expect.arrayContaining(["flag:warn"]));

    // An artifact with an open comment leaves the Keeper's sweep (already in the admin's hands).
    const sweep2 = await call(reviewTargets as never, { token: KEEPER, method: "GET", url: "http://itest/api/worker/review-targets?limit=50" });
    expect((sweep2.body.items as { id: string }[]).map((i) => i.id)).not.toContain(a3.id);
  });

  it("soft-delete hides a published artifact from the public and is recoverable", async () => {
    await adminSetDeleted(a3.id, true);
    expect(await publicGet(a3.slug)).toBeNull();
    await adminSetDeleted(a3.id, false);
    expect(await publicGet(a3.slug)).toMatchObject({ slug: a3.slug, status: "published" });
  });
});
