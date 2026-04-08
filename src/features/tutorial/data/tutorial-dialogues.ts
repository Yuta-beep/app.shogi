import type { ImageSourcePropType } from 'react-native';

import { tutorialAssets } from '@/constants/tutorial-assets';

/** tutorial.html の tutorialDialogues と同一 */
export type TutorialDialogue = {
  name: string;
  text: string;
  video?: string;
};

export const tutorialDialogues: TutorialDialogue[] = [
  {
    name: 'シン',
    text: '真名仮名の世界へようこそ                                 　　　俺の名前は瑪師(ばし)だ',
  },
  {
    name: 'シン',
    text: 'これからあなたは集めた漢字駒を用いて将棋盤の上で戦う',
  },
  {
    name: 'シン',
    text: '駒の集め方は主に3つ',
  },
  {
    name: 'シン',
    text: '1つ目はダンジョンのクリア',
  },
  {
    name: 'シン',
    text: 'ダンジョンをクリアすると敵として出現した駒を獲得できる',
  },
  {
    name: 'シン',
    text: '特殊能力をもつ駒や特殊効果が発動するマスには気をつけろ',
  },
  {
    name: 'シン',
    text: '2つ目は駒ガチャ',
  },
  {
    name: 'シン',
    text: '運が良ければ強力な駒を獲得できる',
  },
  {
    name: 'シン',
    text: '当たり駒の出やすさはガチャ玉の色を見て確認できる　　　　　　　　　　　　　当たる確率が低い色から白青赤金黒だ',
  },
  {
    name: 'シン',
    text: '3つ目は駒ショップ',
  },
  {
    name: 'シン',
    text: '「歩」や「金」を通貨として強力な駒を購入できる',
  },
  {
    name: 'シン',
    text: '駒を集めたらデッキビルダーで将棋デッキを作成',
  },
  {
    name: 'シン',
    text: 'デッキには上限コストがあり強力な駒はコストが大きい',
  },
  {
    name: 'シン',
    text: '各駒には特殊能力やスキルがある',
  },
  {
    name: 'シン',
    text: '各駒の移動範囲やスキルの情報は駒図鑑から参照できる',
  },
  {
    name: 'シン',
    text: '漢字駒を集めて自分だけのデッキを作ったら対人対戦だ',
  },
  {
    name: 'シン',
    text: '対人対戦に勝てばレートが上がる',
  },
  {
    name: 'シン',
    text: 'レート上位者には称号が与えられる',
  },
  {
    name: 'シン',
    text: '真名仮名の名人の称号を手に入れろ',
  },
];

/** tutorial.html の updateDialogue と同じインデックスで表示する左側オーバーレイ画像 */
export type TutorialOverlayLayout = {
  source: ImageSourcePropType;
  top: number;
  left: number;
  height: number;
};

export function getTutorialOverlayForIndex(index: number): TutorialOverlayLayout | null {
  const map: Record<number, TutorialOverlayLayout> = {
    1: { source: tutorialAssets.overlays.board, top: 120, left: 12, height: 180 },
    3: { source: tutorialAssets.overlays.stage, top: 50, left: 18, height: 250 },
    4: { source: tutorialAssets.overlays.light, top: 70, left: 18, height: 230 },
    5: { source: tutorialAssets.overlays.specialSquare, top: 70, left: 18, height: 220 },
    6: { source: tutorialAssets.overlays.ukanmuri, top: 60, left: 18, height: 250 },
    7: { source: tutorialAssets.overlays.gacha, top: 80, left: 18, height: 200 },
    8: { source: tutorialAssets.overlays.gachaBall, top: 40, left: 18, height: 260 },
    9: { source: tutorialAssets.overlays.shop, top: 40, left: 18, height: 260 },
    10: { source: tutorialAssets.overlays.currency, top: 140, left: 30, height: 150 },
    11: { source: tutorialAssets.overlays.deckbuilder, top: 70, left: 14, height: 220 },
    12: { source: tutorialAssets.overlays.cost, top: 70, left: 6, height: 220 },
    14: { source: tutorialAssets.overlays.book, top: 40, left: 2, height: 260 },
    15: { source: tutorialAssets.overlays.versus, top: 130, left: 18, height: 140 },
    16: { source: tutorialAssets.overlays.versus, top: 130, left: 18, height: 140 },
  };
  return map[index] ?? null;
}
