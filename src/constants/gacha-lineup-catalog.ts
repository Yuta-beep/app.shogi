import { formatPieceRateTextFromLineup } from '@/features/gacha-room/lib/gacha-lineup-rates';
import { resolveGachaBannerKey } from '@/constants/gacha-room-assets';
import type { GachaBanner, GachaLineupEntry } from '@/usecases/gacha-room/load-gacha-lobby-usecase';

/** うかんむりガチャ：室7%・定10%・安10%・宋3%・歩45%・金25% */
export const UKANMURI_GACHA_LINEUP: GachaLineupEntry[] = [
  {
    char: '室',
    name: '室',
    rarity: 'SR',
    weight: 7,
    description: 'セーフルームを用意して「王」を守る。',
  },
  { char: '定', name: '定', rarity: 'R', weight: 10, description: '相手の戦略を固定しろ。' },
  {
    char: '安',
    name: '安',
    rarity: 'R',
    weight: 10,
    description: '移動時10%の確率で、相手の特殊駒を1体「歩」に変える。',
  },
  {
    char: '宋',
    name: '宋',
    rarity: 'UR',
    weight: 3,
    description: '移動時20%の確率で、周囲8マスのランダムな空きマス1マスに「金」を召喚する。',
  },
  { char: '歩', name: '歩', rarity: 'N', weight: 45, description: '歩通貨が1増える。' },
  { char: '金', name: '金', rarity: 'N', weight: 25, description: '金通貨が1増える。' },
];

export const HI_HEN_GACHA_LINEUP: GachaLineupEntry[] = [
  { char: '歩', name: '歩', rarity: 'N', weight: 45, description: '歩通貨が1増える。' },
  { char: '金', name: '金', rarity: 'N', weight: 25, description: '金通貨が1増える。' },
  {
    char: '爆',
    name: '爆',
    rarity: 'UR',
    weight: 5,
    description: '爆発で周囲の敵駒を吹き飛ばす破壊的な駒。',
  },
  { char: '煽', name: '煽', rarity: 'SR', weight: 10, description: '相手を煽りたい人の為に。' },
  {
    char: '灯',
    name: '灯',
    rarity: 'R',
    weight: 15,
    description: '移動時20%の確率で、味方の「歩」をランダムに1体「火」駒に変化させる。',
  },
];

export const SHINNYO_GACHA_LINEUP: GachaLineupEntry[] = [
  { char: '歩', name: '歩', rarity: 'N', weight: 45, description: '歩通貨が1増える。' },
  { char: '金', name: '金', rarity: 'N', weight: 25, description: '金通貨が1増える。' },
  {
    char: '辺',
    name: '辺',
    rarity: 'SR',
    weight: 7,
    description: '移動時、ランダムに選んだ1辺上のすべての駒を2ターン移動不能にする。',
  },
  {
    char: '逸',
    name: '逸',
    rarity: 'R',
    weight: 10,
    description: '移動時30%の確率で、相手の駒（王を除く）を1体ランダムに相手の手持ち駒に送る。',
  },
  { char: '進', name: '進', rarity: 'R', weight: 10, description: '次はどこに進んでいくのか。' },
  {
    char: '逃',
    name: '逃',
    rarity: 'UR',
    weight: 3,
    description: '移動すると味方の王も同じ方向へ逃がす緊急離脱の駒。',
  },
];

export const KANKEN1_GACHA_LINEUP: GachaLineupEntry[] = [
  { char: '歩', name: '歩', rarity: 'N', weight: 66, description: '歩通貨が1増える。' },
  { char: '金', name: '金', rarity: 'N', weight: 25, description: '金通貨が1増える。' },
  {
    char: '艸',
    name: '艸',
    rarity: 'UR',
    weight: 3,
    description: '草の力を操り盤面を支配する自然の駒。',
  },
  { char: '閹', name: '閹', rarity: 'UR', weight: 3, description: '敵の動きを封じる封印の駒。' },
  {
    char: '膠',
    name: '膠',
    rarity: 'SSR',
    weight: 3,
    description: '盤面を膠着させ敵の動きを止める粘着の駒。',
  },
];

type GachaLineupCatalogEntry = {
  description: string;
  rareRateText: string;
  lineup: GachaLineupEntry[];
};

const GACHA_LINEUP_CATALOG: Record<string, GachaLineupCatalogEntry> = {
  ukanmuri: {
    description: '室・定・安・宋・歩・金のいずれかがランダムで排出されます。',
    rareRateText: 'UR 3% / SR 7%',
    lineup: UKANMURI_GACHA_LINEUP,
  },
  hiHen: {
    description: '歩・金・爆・煽・灯のいずれかがランダムで排出されます。',
    rareRateText: 'UR 4% / SR 10%',
    lineup: HI_HEN_GACHA_LINEUP,
  },
  shinnyo: {
    description: '歩・金・辺・逸・進・逃のいずれかがランダムで排出されます。',
    rareRateText: 'UR 3% / SR 7%',
    lineup: SHINNYO_GACHA_LINEUP,
  },
  kanken1: {
    description: '歩・金・艸・閹・膠のいずれかがランダムで排出されます。',
    rareRateText: 'UR 7% / SSR 3%',
    lineup: KANKEN1_GACHA_LINEUP,
  },
};

/** API に lineup が無い場合も、クライアント定義の排出表で表示・説明を補完する */
export function enrichGachaBanner(banner: GachaBanner): GachaBanner {
  const key = resolveGachaBannerKey(banner.key);
  const catalog = GACHA_LINEUP_CATALOG[key];
  if (!catalog) return banner;

  return {
    ...banner,
    lineup: catalog.lineup,
    description: banner.description?.trim() ? banner.description : catalog.description,
    rareRateText: banner.rareRateText?.trim() ? banner.rareRateText : catalog.rareRateText,
    pieceRateText:
      banner.pieceRateText?.trim()
        ? banner.pieceRateText
        : formatPieceRateTextFromLineup(catalog.lineup),
  };
}

export function enrichGachaLobbySnapshot(banners: GachaBanner[]): GachaBanner[] {
  return banners.map(enrichGachaBanner);
}
