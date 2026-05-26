import { enrichGachaBanner } from '@/constants/gacha-lineup-catalog';
import { resolveGachaBannerKey } from '@/constants/gacha-room-assets';
import type { GachaBanner } from '@/usecases/gacha-room/load-gacha-lobby-usecase';

/** ガチャ一覧の表示順（HTML 版 gacha_room と同じ） */
export const GACHA_INTRO_KEYS = ['ukanmuri', 'hiHen', 'shinnyo', 'kanken1'] as const;

const INTRO_FALLBACK: Record<(typeof GACHA_INTRO_KEYS)[number], GachaBanner> = {
  ukanmuri: {
    key: 'ukanmuri',
    name: 'うかんむりガチャ',
    rareRateText: '',
    pieceRateText: '',
    description: null,
    lineup: [],
    pawnCost: 10,
    goldCost: 0,
  },
  hiHen: {
    key: 'hiHen',
    name: 'ひへんガチャ',
    rareRateText: '',
    pieceRateText: '',
    description: null,
    lineup: [],
    pawnCost: 10,
    goldCost: 0,
  },
  shinnyo: {
    key: 'shinnyo',
    name: 'しんにょうガチャ',
    rareRateText: '',
    pieceRateText: '',
    description: null,
    lineup: [],
    pawnCost: 10,
    goldCost: 0,
  },
  kanken1: {
    key: 'kanken1',
    name: '漢検1級ガチャ',
    rareRateText: '',
    pieceRateText: '',
    description: null,
    lineup: [],
    usesGold: true,
    pawnCost: 0,
    goldCost: 2,
  },
};

/**
 * 一覧画面では常に4ガチャをこの順で表示。API 結果があればマージ（排出表・コスト等）。
 */
export function mergeIntroBanners(apiBanners: GachaBanner[]): GachaBanner[] {
  return GACHA_INTRO_KEYS.map((introKey) => {
    const fromApi = apiBanners.find((b) => resolveGachaBannerKey(b.key) === introKey);
    if (fromApi) return enrichGachaBanner(fromApi);
    return enrichGachaBanner(INTRO_FALLBACK[introKey]);
  });
}
