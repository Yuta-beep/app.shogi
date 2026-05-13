import { z } from 'zod';

export const HomeSnapshotSchema = z.object({
  playerName: z.string(),
  rating: z.number(),
  pawnCurrency: z.number(),
  goldCurrency: z.number(),
  playerRank: z.number(),
  playerExp: z.number(),
  stamina: z.number(),
  maxStamina: z.number(),
  nextRecoveryAt: z.string().nullable(),
});

export type HomeSnapshot = z.infer<typeof HomeSnapshotSchema>;
