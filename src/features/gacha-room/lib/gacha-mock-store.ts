import { resolveGachaBannerKey } from '@/constants/gacha-room-assets';
import {
  buildGachaOwnedPiecesForDeckBuilder,
  isGachaCollectibleChar,
} from '@/constants/gacha-piece-metadata';

type GachaMockWallet = {
  pawnCurrency: number;
  goldCurrency: number;
};

let wallet: GachaMockWallet = {
  pawnCurrency: 3000,
  goldCurrency: 20,
};

const ownedGachaChars = new Set<string>();

export function getGachaMockWallet(): GachaMockWallet {
  return { ...wallet };
}

export function setGachaMockWallet(next: GachaMockWallet): void {
  wallet = { ...next };
}

export function ownsGachaCollectible(char: string): boolean {
  return ownedGachaChars.has(char);
}

/** 新規獲得なら true。既所持なら false */
export function grantGachaCollectible(char: string): boolean {
  if (!isGachaCollectibleChar(char) || ownedGachaChars.has(char)) {
    return false;
  }
  ownedGachaChars.add(char);
  return true;
}

export function grantDuplicateGoldReward(): GachaMockWallet {
  wallet = { ...wallet, goldCurrency: wallet.goldCurrency + 1 };
  return getGachaMockWallet();
}

export function getGachaMockOwnedPiecesForDeckBuilder() {
  return buildGachaOwnedPiecesForDeckBuilder(ownedGachaChars);
}

const GACHA_ROLL_COST: Record<string, { pawnCost: number; goldCost: number }> = {
  ukanmuri: { pawnCost: 30, goldCost: 0 },
  hiHen: { pawnCost: 30, goldCost: 0 },
  shinnyo: { pawnCost: 30, goldCost: 0 },
  kanken1: { pawnCost: 0, goldCost: 1 },
};

export function spendGachaRollCost(gachaId: string): { ok: boolean; wallet: GachaMockWallet } {
  const key = resolveGachaBannerKey(gachaId);
  const cost = GACHA_ROLL_COST[key] ?? { pawnCost: 0, goldCost: 0 };

  if (cost.pawnCost > 0 && wallet.pawnCurrency < cost.pawnCost) {
    return { ok: false, wallet: getGachaMockWallet() };
  }
  if (cost.goldCost > 0 && wallet.goldCurrency < cost.goldCost) {
    return { ok: false, wallet: getGachaMockWallet() };
  }

  wallet = {
    pawnCurrency: wallet.pawnCurrency - cost.pawnCost,
    goldCurrency: wallet.goldCurrency - cost.goldCost,
  };
  return { ok: true, wallet: getGachaMockWallet() };
}

export function addGachaMockCurrency(delta: { pawn?: number; gold?: number }): GachaMockWallet {
  wallet = {
    pawnCurrency: wallet.pawnCurrency + (delta.pawn ?? 0),
    goldCurrency: wallet.goldCurrency + (delta.gold ?? 0),
  };
  return getGachaMockWallet();
}

/** テスト用 */
export function resetGachaMockStore(): void {
  wallet = { pawnCurrency: 3000, goldCurrency: 20 };
  ownedGachaChars.clear();
}
