import { z } from 'zod';

export const MoveVectorSchema = z.object({
  dx: z.number(),
  dy: z.number(),
  maxStep: z.number(),
  captureMode: z.string().nullable().optional(),
});

export const MoveRuleSchema = z.object({
  ruleType: z.string(),
  priority: z.number(),
  params: z.record(z.string(), z.unknown()),
});

export const PieceCatalogItemSchema = z.object({
  pieceId: z.number().optional(),
  pieceCode: z.string().nullable().optional(),
  sfenCode: z.string().nullable().optional(),
  canonicalCode: z.string().nullable().optional(),
  isPromoted: z.boolean().optional(),
  moveCode: z.string().nullable().optional(),
  char: z.string(),
  name: z.string(),
  imageSignedUrl: z.string().nullable().optional(),
  quantity: z.number().optional(),
  unlock: z.string(),
  desc: z.string(),
  skill: z.string(),
  move: z.string(),
  moveVectors: z.array(MoveVectorSchema),
  isRepeatable: z.boolean(),
  canJump: z.boolean().optional(),
  moveConstraints: z.record(z.string(), z.unknown()).nullable().optional(),
  moveRules: z.array(MoveRuleSchema).optional(),
  skillDefinitionsV2: z.unknown().optional(),
  skill_definitions_v2: z.unknown().optional(),
});

export const PieceCatalogResponseSchema = z.object({
  items: z.array(PieceCatalogItemSchema),
});

// Types inferred from schemas
export type MoveVector = z.infer<typeof MoveVectorSchema>;
export type MoveRule = z.infer<typeof MoveRuleSchema>;
export type PieceCatalogItem = z.infer<typeof PieceCatalogItemSchema>;
export type PieceCatalogResponse = z.infer<typeof PieceCatalogResponseSchema>;
