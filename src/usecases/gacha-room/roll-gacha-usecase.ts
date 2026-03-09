export type RollGachaInput = {
  gachaId: string;
};

export type GachaPiece = {
  char: string;
  name: string;
  rarity: string;
  description: string;
};

export type RollGachaResult =
  | { type: 'hit'; piece: GachaPiece; alreadyOwned: boolean; duplicateLabel?: string }
  | { type: 'miss'; currency: 'pawn' | 'gold'; amount: number };

export interface RollGachaUseCase {
  execute(input: RollGachaInput): Promise<RollGachaResult>;
}
