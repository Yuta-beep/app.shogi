import { z } from 'zod';

export const BattleSetupPlacementSchema = z.object({
  row: z.number(),
  col: z.number(),
  pieceId: z.number(),
  pieceCode: z.string(),
});

export const BattleSetupHandPieceSchema = z.object({
  pieceId: z.number(),
  pieceCode: z.string(),
  count: z.number(),
});

export const SaveOnlineMatchSetupPayloadSchema = z.object({
  name: z.string().optional(),
  boardLayout: z.array(BattleSetupPlacementSchema),
  handsLayout: z.array(BattleSetupHandPieceSchema),
  selectedPieceIds: z.array(z.number()),
});

export const SaveOnlineMatchSetupResultSchema = z.object({
  battleSetupId: z.string(),
  status: z.enum(['draft', 'validated', 'locked', 'consumed']),
});

export const MatchingPlayerLineSchema = z.object({
  displayName: z.string(),
  rating: z.number(),
});

export const MatchingSnapshotSchema = z.object({
  title: z.string(),
  status: z.string(),
  progress: z.number(),
  self: MatchingPlayerLineSchema.optional(),
  opponent: MatchingPlayerLineSchema.optional(),
});

export type BattleSetupPlacement = z.infer<typeof BattleSetupPlacementSchema>;
export type BattleSetupHandPiece = z.infer<typeof BattleSetupHandPieceSchema>;
export type SaveOnlineMatchSetupPayload = z.infer<typeof SaveOnlineMatchSetupPayloadSchema>;
export type SaveOnlineMatchSetupResult = z.infer<typeof SaveOnlineMatchSetupResultSchema>;
export type MatchingSnapshot = z.infer<typeof MatchingSnapshotSchema>;
