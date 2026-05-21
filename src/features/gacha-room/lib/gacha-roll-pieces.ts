import { resolveGachaBannerKey } from '@/constants/gacha-room-assets';
import type { GachaLineupEntry } from '@/usecases/gacha-room/load-gacha-lobby-usecase';

export type GachaRollPiece = GachaLineupEntry & {
  isCurrency?: boolean;
  currencyType?: 'pawn' | 'gold';
};

export function lineupToGachaRollPieces(lineup: GachaLineupEntry[]): GachaRollPiece[] {
  return lineup.map((entry) => ({
    ...entry,
    description: entry.description ?? '',
    isCurrency: entry.char === '歩' || entry.char === '金',
    currencyType: entry.char === '歩' ? 'pawn' : entry.char === '金' ? 'gold' : undefined,
  }));
}

/** HTML 版 gacha_room.html の通貨排出加算 */
export function gachaCurrencyRewardAmount(gachaId: string, currencyType: 'pawn' | 'gold'): number {
  const key = resolveGachaBannerKey(gachaId);
  if (currencyType === 'gold') {
    return ['ukanmuri', 'hiHen', 'shinnyo', 'kanken1'].includes(key) ? 1 : 0;
  }
  if (key === 'kanken1') return 5;
  if (['ukanmuri', 'hiHen', 'shinnyo'].includes(key)) return 2;
  return 1;
}
