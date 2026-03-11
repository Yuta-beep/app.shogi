export type GachaBanner = {
  key: string;
  name: string;
  rareRateText: string;
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
