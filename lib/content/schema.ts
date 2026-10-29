import { z } from "zod";

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
    board: z.string().min(1),
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
  hints: z.array(z.string().min(1)),
  source_url: z.url(),
});

/** content/sketches/<project>.json: the code step of each level that has one, by level position. */
export const sketchesSchema = z.object({ levels: z.record(position, sketchStepSchema) });

export type SketchStep = z.infer<typeof sketchStepSchema>;
