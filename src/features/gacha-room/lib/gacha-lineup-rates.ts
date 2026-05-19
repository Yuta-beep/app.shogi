import type { GachaLineupEntry } from '@/usecases/gacha-room/load-gacha-lobby-usecase';

export function gachaLineupWeightTotal(lineup: GachaLineupEntry[]): number {
  return lineup.reduce((sum, entry) => sum + Math.max(0, entry.weight), 0);
}

export function gachaLineupDropRatePercent(entry: GachaLineupEntry, totalWeight: number): number {
  if (totalWeight <= 0) return 0;
  return Math.round((Math.max(0, entry.weight) / totalWeight) * 100);
}

export function formatGachaLineupDropRateLabel(
  entry: GachaLineupEntry,
  totalWeight: number,
): string {
  return `${gachaLineupDropRatePercent(entry, totalWeight)}%`;
}

/** HTML 版の pieceRateText（歩45%・金25%…） */
export function formatPieceRateTextFromLineup(lineup: GachaLineupEntry[]): string {
  const total = gachaLineupWeightTotal(lineup);
  if (total <= 0) return '';
  return lineup
    .map((entry) => `${entry.char}${gachaLineupDropRatePercent(entry, total)}%`)
    .join('・');
}
