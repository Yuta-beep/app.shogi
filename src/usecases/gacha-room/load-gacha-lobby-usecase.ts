export type GachaLineupEntry = {
  char: string;
  name: string;
  rarity: string;
  weight: number;
  /** master.m_piece.move_description_ja（BFF 経由） */
  description?: string | null;
};

export type GachaBanner = {
  key: string;
  name: string;
  rareRateText: string;
  /** HTML 版の排出割合ラベル（歩45%・金25%…） */
  pieceRateText: string;
  description: string | null;
  lineup: GachaLineupEntry[];
  usesGold?: boolean;
  pawnCost: number;
  goldCost: number;
  imageSignedUrl?: string | null;
};

export type GachaLobbySnapshot = {
  banners: GachaBanner[];
  pawnCurrency: number;
  goldCurrency: number;
  history: string[];
};

export interface LoadGachaLobbyUseCase {
  execute(): Promise<GachaLobbySnapshot>;
}
