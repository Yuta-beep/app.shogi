export type RollGachaInput = {
  gachaId: string;
};

export type GachaPiece = {
  char: string;
  name: string;
  rarity: string;
  description: string;
  imageSignedUrl?: string | null;
};

export type RollGachaResult =
  | {
      type: 'hit';
      piece: GachaPiece;
      alreadyOwned: boolean;
      duplicateLabel?: string;
      pawnCurrency: number;
      goldCurrency: number;
    }
  | {
      type: 'miss';
      currency: 'pawn' | 'gold';
      amount: number;
      pawnCurrency: number;
      goldCurrency: number;
    };

export interface RollGachaUseCase {
  execute(input: RollGachaInput): Promise<RollGachaResult>;
}
