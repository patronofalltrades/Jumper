import { z } from "zod";

// A pin on a part on the board: "<part id>.<pin>", for example "mic1.WS", "esp.GPIO4" or "bbA.+" (a breadboard rail).
export const endpointSchema = z.string().regex(/^[a-z][A-Za-z0-9]*\.[A-Za-z0-9+-]+$/, "Use <part>.<pin>, for example mic1.WS");

const connection = { a: endpointSchema, b: endpointSchema };

export const targetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("wire"), ...connection }),
  z.object({ kind: z.literal("place"), part: z.string().min(1), id: z.string().min(1), zone: z.string().min(1) }),
]);

export const rulesSchema = z.object({
  require: z.array(z.object(connection)).min(1),
  forbid: z.array(z.object({ ...connection, code: z.string().min(1), message: z.string().min(1) })),
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
