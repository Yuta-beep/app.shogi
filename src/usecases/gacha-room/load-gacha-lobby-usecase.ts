export type GachaBanner = {
  key: 'ukanmuri' | 'hihen' | 'shinnyo' | 'kanken1';
  name: string;
  rareRateText: string;
  usesGold?: boolean;
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
