import { z } from "zod";

// Versioned slot schema for Knovo artifacts (v1). See foundation/artifact-schema.md.
// The routine fills slots only; this schema is the validation boundary BEFORE storage.
// Grow the vocabulary only via a reviewed version bump + a normalize-on-read migration,
// so older artifacts keep rendering.

export const CURRENT_SCHEMA_VERSION = 1 as const;

const sourceRef = z.object({
  db: z.enum(["pdb", "chembl", "pubmed", "biorxiv"]),
  uid: z.string().min(1),
});

const highlight = z.object({
  id: z.string().min(1),
  selection: z.string().min(1),
  color: z.string().optional(),
});

// ── stage (exactly one; discriminated on kind) ───────────────────────────────
const molecular3dStage = z.object({
  id: z.string().min(1),
  kind: z.literal("molecular3d"),
  source: sourceRef,
  representation: z
    .enum(["cartoon", "surface", "sticks", "spheres"])
    .default("cartoon"),
  highlights: z.array(highlight).default([]),
  initialCamera: z.object({ preset: z.string() }).partial().optional(),
});

const diagramStage = z.object({
  id: z.string().min(1),
  kind: z.literal("diagram"),
  snapshot: z.record(z.string(), z.unknown()),
});

const chartStage = z.object({
  id: z.string().min(1),
  kind: z.literal("chart"),
  chartType: z.enum(["line", "bar", "scatter"]),
  axes: z.object({ x: z.string(), y: z.string() }).passthrough(),
  series: z.array(
    z.object({
      name: z.string(),
      data: z.array(z.record(z.string(), z.unknown())),
    }),
  ),
});

const stage = z.discriminatedUnion("kind", [
  molecular3dStage,
  diagramStage,
  chartStage,
]);

// ── panels[] ─────────────────────────────────────────────────────────────────
const prosePanel = z.object({
  id: z.string().min(1),
  kind: z.literal("prose"),
  content: z.string(),
});
const keyvaluePanel = z.object({
  id: z.string().min(1),
  kind: z.literal("keyvalue"),
  content: z.array(z.object({ k: z.string(), v: z.string() })),
});
const figurePanel = z.object({
  id: z.string().min(1),
  kind: z.literal("figure"),
  content: z.object({ src: z.string(), alt: z.string() }),
});
const panel = z.discriminatedUnion("kind", [
  prosePanel,
  keyvaluePanel,
  figurePanel,
]);

// ── controls[] (drive the stage) ─────────────────────────────────────────────
const control = z.object({
  id: z.string().min(1),
  label: z.string(),
  kind: z.enum(["toggle", "slider", "select", "stepper"]),
  target: z.string().min(1), // must reference the stage id
  param: z.string().min(1),
  options: z.array(z.union([z.string(), z.number()])).optional(),
  default: z.union([z.string(), z.number(), z.boolean()]).optional(),
});

// ── captions[] (annotate a slot) ─────────────────────────────────────────────
const caption = z.object({
  id: z.string().min(1),
  target: z.string().min(1), // slot id, or "stage:<highlightId>"
  text: z.string().min(1),
});

// ── document ─────────────────────────────────────────────────────────────────
export const artifactDocV1 = z
  .object({
    schemaVersion: z.literal(1),
    title: z.string().min(1),
    summary: z.string().min(1),
    stage,
    panels: z.array(panel).default([]),
    controls: z.array(control).default([]),
    captions: z.array(caption).default([]),
  })
  .superRefine((doc, ctx) => {
    const stageId = doc.stage.id;
    const highlightIds =
      doc.stage.kind === "molecular3d"
        ? doc.stage.highlights.map((h) => h.id)
        : [];
    const slotIds = new Set<string>([stageId, ...doc.panels.map((p) => p.id)]);

    // controls.target must reference the stage
    for (const c of doc.controls) {
      if (c.target !== stageId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["controls"],
          message: `control "${c.id}" target "${c.target}" must reference the stage id "${stageId}"`,
        });
      }
    }

    // caption.target must reference an existing slot or stage highlight
    for (const cap of doc.captions) {
      const t = cap.target;
      const ok =
        slotIds.has(t) ||
        (t.startsWith("stage:") &&
          highlightIds.includes(t.slice("stage:".length)));
      if (!ok) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["captions"],
          message: `caption "${cap.id}" target "${t}" must reference an existing slot or stage highlight`,
        });
      }
    }

    // slot ids must be unique across the document
    const ids = [
      stageId,
      ...doc.panels.map((p) => p.id),
      ...doc.controls.map((c) => c.id),
      ...doc.captions.map((c) => c.id),
    ];
    const dupes = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
    if (dupes.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `duplicate slot ids: ${dupes.join(", ")}`,
      });
    }
  });

export type ArtifactDocV1 = z.infer<typeof artifactDocV1>;

// Version registry — add new versions here alongside a normalize-on-read migration.
const artifactSchemas = { 1: artifactDocV1 } as const;

export function safeParseArtifactDoc(version: number, doc: unknown) {
  const schema = artifactSchemas[version as keyof typeof artifactSchemas];
  if (!schema) {
    return {
      success: false as const,
      error: `Unknown artifact schemaVersion: ${version}`,
    };
  }
  return schema.safeParse(doc);
}
