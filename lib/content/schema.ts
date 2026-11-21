import { z } from "zod";
import { MASCOT_IDS } from "../game/project-mascot";

// A pin on a part on the board: "<part id>.<pin>", for example "mic1.WS", "esp.GPIO4", "uno.D13" or "bbA.+" (a breadboard rail).
export const endpointSchema = z.string().regex(/^[a-z][A-Za-z0-9]*\.[A-Za-z0-9+-]+$/, "Use <part>.<pin>, for example mic1.WS");

const connection = { a: endpointSchema, b: endpointSchema };

export const targetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("wire"), ...connection }),
  z.object({ kind: z.literal("place"), part: z.string().min(1), id: z.string().min(1), zone: z.string().min(1) }),
]);

export const rulesSchema = z.object({
  require: z.array(z.object(connection)).min(1),
  forbid: z.array(z.object({ ...connection, code: z.string().min(1), message: z.string().min(1), place_message: z.string().min(1).optional() })),
});

export const taskSchema = z
  .object({
    position: z.number().int().positive(),
    kind: z.enum(["place", "wire"]),
    instruction: z.string().min(1),
    popup_why: z.string().min(1),
    concept: z.string().min(1).nullable(),
    target: targetSchema,
    source_url: z.url(),
    xp: z.number().int().nonnegative(),
  })
  .refine((t) => t.kind === t.target.kind, { message: "kind must match target.kind", path: ["kind"] });

export const levelSchema = z.object({
  position: z.number().int().positive(),
  title: z.string().min(1),
  goal: z.string().min(1),
  rules: rulesSchema,
  xp: z.number().int().nonnegative(),
  tasks: z.array(taskSchema).min(1),
});

export const projectSchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    title: z.string().min(1),
    tagline: z.string().min(1),
    /** A few sentences about the project, for the top of its level path. */
    description: z.string().min(1).optional(),
    board: z.string().min(1),
    mascot: z.enum(MASCOT_IDS).optional(),
    status: z.enum(["available", "coming_soon"]),
    position: z.number().int().positive(),
    levels: z.array(levelSchema),
  })
  .refine((p) => p.status === "coming_soon" || p.levels.length > 0, {
    message: "An available project needs levels",
    path: ["levels"],
  });

export type Project = z.infer<typeof projectSchema>;
export type Level = z.infer<typeof levelSchema>;
export type Task = z.infer<typeof taskSchema>;

// A part on the bench (TRD 6.3): a two-leg part from hole `a` to hole `b`, or a module with pin 1 in hole `at`.
// A hole is a breadboard hole ("A-c14"), a pin socket of the main board ("uno-D13"), or a screw terminal ("amp1.OUT+").
const spot = z.string().regex(/^([A-Z]-[a-jLR+-]+\d+|[a-z]+-[A-Za-z0-9]+|[a-z][A-Za-z0-9]*\.[A-Za-z0-9+-]+)$/);

export const partSchema = z.union([
  z.object({ id: z.string().min(1), type: z.enum(["wire", "resistor", "led", "speaker"]), a: spot, b: spot, color: z.string().optional() }),
  z.object({ id: z.string().min(1), type: z.enum(["pushbutton", "inmp441", "max98357a", "st7789-154"]), at: spot }),
]);

const position = z.string().regex(/^[1-9]\d*$/);

/**
 * content/boards/<project>.json: the parts that each level adds, by level position. `start`: the levels whose parts a
 * level starts with, when it is not all the levels before it.
 */
export const boardsSchema = z.object({
  levels: z.record(position, z.array(partSchema)),
  start: z.record(position, z.array(z.number().int().positive())).optional(),
});

export type Boards = z.infer<typeof boardsSchema>;

const rail = z.enum(["L+", "L-", "R-", "R+"]);

/** content/benches/<project>.json: the breadboards, the main board, and where the main board is (lib/circuit/bench.ts). */
export const benchSchema = z.object({
  board: z.enum(["esp32-s3-devkitc-1", "arduino-uno"]),
  id: z.string().regex(/^[a-z]+$/),
  name: z.string().min(1),
  breadboards: z.array(z.object({ id: z.string().regex(/^[A-Z]$/), x: z.number() })).min(1),
  mount: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("breadboard"), first_column: z.number().int().positive(), headers: z.record(z.string(), z.string().regex(/^[A-Z]-[a-j]$/)) }),
    z.object({ kind: z.literal("table"), x: z.number(), z: z.number() }),
  ]),
  open_rails: z.record(z.string().regex(/^[A-Z]$/), z.object({ "+": rail, "-": rail })),
  view: z.object({ target: z.object({ x: z.number(), z: z.number() }), width: z.number().positive(), length: z.number().positive() }),
});

/** The goal of a code step (lib/sketch/goal.ts). `led`: a part id on the board, or `uno.L` for the L light of the Uno. */
export const goalSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("blink"), led: z.string().min(1), led_name: z.string().min(1), on_ms: z.number().int().positive(), off_ms: z.number().int().positive() }),
  z.object({ kind: z.literal("button"), led: z.string().min(1), led_name: z.string().min(1), button: z.string().min(1) }),
]);

/** The code step of a level: after its wiring tasks, the learner writes a sketch that does the goal (issue #58). */
export const sketchStepSchema = z.object({
  task: z.string().min(1),
  goal_text: z.string().min(1),
  goal: goalSchema,
  starter: z.array(z.string()).min(1),
  /** The full sketch that "Write it for me" puts in the editor (issue #145). */
  solution: z.array(z.string()).min(1),
  hints: z.array(z.string().min(1)),
  source_url: z.url(),
  /** Step by step (issue #144): the lines of the sketch, in order, each with its goal in simple words (lib/sketch/steps.ts). */
  steps: z.array(z.object({ line: z.string().min(1), goal: z.string().min(1), accept: z.array(z.string().min(1)).optional(), hint: z.string().min(1).optional() })).min(1).optional(),
});

/** content/sketches/<project>.json: the code step of each level that has one, by level position. */
export const sketchesSchema = z.object({ levels: z.record(position, sketchStepSchema) });

export type SketchStep = z.infer<typeof sketchStepSchema>;

// content/terms/<project>.json: the terms of one project, each tied to the level that teaches it (lib/content/terms.ts).
export const termsFileSchema = z.object({
  project: z.string().regex(/^[a-z0-9-]+$/),
  terms: z.array(z.object({ term: z.string().min(1), definition: z.string().min(1), level: z.number().int().positive() })).min(1),
});

// content/code-terms/<language>.json: the code words of a sketch, each tied to the level that teaches it (issue #143).
export const codeTermsSchema = z.object({
  project: z.string().regex(/^[a-z0-9-]+$/),
  words: z
    .array(
      z.object({
        keys: z.array(z.string().min(1)).min(1),
        word: z.string().min(1),
        level: z.number().int().positive(),
        text: z.string().min(1),
        example: z.string().min(1),
        does: z.string().min(1),
      }),
    )
    .min(1),
});

// content/lessons/<id>.json: one lesson of the learning journey (TRD addendum 6.1). It fixes the reference circuit of a
// level with a version, and maps each terminal and connection to a stable id. A change of the circuit, the code or the
// map needs a new version.
const slug = z.string().regex(/^[a-z0-9-]+$/);

/** What the LED does in the simulator (lib/sketch/observe.ts). */
export const observedSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("off") }),
  z.object({ kind: z.literal("on") }),
  z.object({ kind: z.literal("blink"), on_ms: z.number().int().positive(), off_ms: z.number().int().positive() }),
]);

/** One step of a change to the reference board or code. `place`: put a part, or move its legs, to the holes a and b. */
export const changeOpSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("place"), part: z.string().min(1), a: spot, b: spot }),
  z.object({ op: z.literal("wire"), id: z.string().min(1), a: spot, b: spot }),
  z.object({ op: z.literal("remove"), part: z.string().min(1) }),
  z.object({ op: z.literal("code"), from: z.string().min(1), to: z.string() }),
]);

/** A point on a reference photo, as a fraction of its width and height. */
const hotspot = z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) });

export const lessonSchema = z.object({
  id: slug,
  version: z.number().int().positive(),
  project: slug,
  level: z.number().int().positive(),
  /** The levels of content/boards/<project>.json that make the reference board. The reference code is the solution of the code step of `level`. */
  baseline: z.object({ levels: z.array(z.number().int().positive()).min(1) }),
  /** The parts of the kit: the part id on the board, and its name. */
  inventory: z.array(z.object({ id: z.string().min(1), name: z.string().min(1) })).min(1),
  concepts: z.array(slug).min(1),
  map: z.object({
    terminals: z
      .array(z.object({ id: endpointSchema, label: z.string().min(1), schematic: z.string().min(1).optional(), photos: z.record(z.string(), hotspot).optional() }))
      .min(1),
    connections: z.array(z.object({ id: slug, a: endpointSchema, b: endpointSchema, explain: z.string().min(1), schematic: z.string().min(1).optional() })).min(1),
  }),
  /**
   * The changes that the simulator can show correctly, and some that it cannot (TRD addendum section 4). A challenge can
   * use only a change with `supported: true`. `ops` changes the reference; `model` is what the simulator then shows. A
   * change that is not supported tells why in `reason`.
   */
  changes: z
    .array(
      z.object({
        id: slug,
        text: z.string().min(1),
        supported: z.boolean(),
        ops: z.array(changeOpSchema).min(1).optional(),
        model: observedSchema.optional(),
        reason: z.string().min(1).optional(),
      }),
    )
    .min(1),
  /** The reference media (work package 4). A lesson does not have it until the real photos and the clip exist. */
  media: z
    .object({
      schematic: z.string().min(1),
      photos: z.record(z.string(), z.object({ src: z.string().min(1), alt: z.string().min(1) })),
      fault: z.object({ src: z.string().min(1), captions: z.string().min(1), description: z.string().min(1) }).optional(),
    })
    .optional(),
  /** The questions (work package 5) and the challenges (work package 6). Those packages set their shape. */
  questions: z.array(z.unknown()).optional(),
  challenges: z.array(z.unknown()).optional(),
});

export type Lesson = z.infer<typeof lessonSchema>;
export type ChangeOp = z.infer<typeof changeOpSchema>;
