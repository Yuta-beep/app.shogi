import type { ImageSourcePropType } from 'react-native';

import { tutorialAssets } from '@/constants/tutorial-assets';

/** メインキャラ（瑪師） */
export const TUTORIAL_CHARACTER_LAYOUT = {
  /** 画面幅 × この値 が基本サイズ */
  widthMultiplier: 1.6,
  maxSize: 920,
  bottom: 120,
  /** 右端からはみ出す量 = 画面幅 × この値 */
  rightOverflowRatio: 0.65,
} as const;

/** 吹き出し・セリフエリア */
export const TUTORIAL_BUBBLE_LAYOUT = {
  spacerHeightMobile: 240,
  spacerHeightTablet: 320,
  tabletBreakpoint: 768,
  paddingHorizontal: 40,
  paddingVertical: 64,
  minTextHeight: 120,
  nextButtonOverlap: -80,
} as const;

/** デッキビルダー説明画像専用（他オーバーレイより大きめ） */
export const TUTORIAL_DECKBUILDER_OVERLAY = {
  top: 35,
  left: 0,
  height: 270,
  width: 330,
  maxWidthRatio: 0.62,
} as const;

/** 戻る / 次へ ボタン（同一行・下端揃え・左右に配置） */
export const TUTORIAL_NAV_BUTTON_LAYOUT = {
  /** 戻る・次へで共通の表示高さ */
  height: 320,
  width: 520,
  row: {
    paddingHorizontal: 4,
    gap: 12,
  },
  prev: {
    maxWidthRatio: 0.38,
    /** 次へボタンよりだけ上にずらす（px） */
    offsetUp: 47,
  },
  next: {
    maxWidthRatio: 0.42,
  },
} as const;

/** 左側オーバーレイ（説明用イラスト）共通 */
export const TUTORIAL_OVERLAY_DEFAULTS = {
  /** width 未指定時: height × この値 */
  widthHeightRatio: 1.2,
  /** width 未指定時: 画面幅 × この値 が上限 */
  maxWidthRatio: 0.55,
} as const;

export type TutorialOverlayLayout = {
  source: ImageSourcePropType;
  top: number;
  left: number;
  height: number;
  /** 省略時は height × widthHeightRatio */
  width?: number;
  /** 省略時は TUTORIAL_OVERLAY_DEFAULTS.maxWidthRatio */
  maxWidthRatio?: number;
};

/**
 * 各ステップのオーバーレイ画像レイアウト。
 * `tutorialDialogues` の index と対応。height / width / top / left をここで調整する。
 */
export const TUTORIAL_OVERLAY_BY_INDEX: Record<number, TutorialOverlayLayout> = {
  1: { source: tutorialAssets.overlays.board, top: 120, left: 12, height: 180 },
  3: { source: tutorialAssets.overlays.stage, top: 50, left: 18, height: 250 },
  4: { source: tutorialAssets.overlays.light, top: 70, left: 18, height: 230 },
  5: { source: tutorialAssets.overlays.specialSquare, top: 70, left: 18, height: 220 },
  6: { source: tutorialAssets.overlays.ukanmuri, top: 60, left: 18, height: 250 },
  7: { source: tutorialAssets.overlays.gacha, top: 80, left: 18, height: 200 },
  8: { source: tutorialAssets.overlays.gachaBall, top: 40, left: 18, height: 260 },
  9: { source: tutorialAssets.overlays.shop, top: 40, left: 18, height: 260 },
  10: { source: tutorialAssets.overlays.currency, top: 140, left: 30, height: 150 },
  11: {
    source: tutorialAssets.overlays.deckbuilder,
    top: TUTORIAL_DECKBUILDER_OVERLAY.top,
    left: TUTORIAL_DECKBUILDER_OVERLAY.left,
    height: TUTORIAL_DECKBUILDER_OVERLAY.height,
    width: TUTORIAL_DECKBUILDER_OVERLAY.width,
    maxWidthRatio: TUTORIAL_DECKBUILDER_OVERLAY.maxWidthRatio,
  },
  12: { source: tutorialAssets.overlays.cost, top: 70, left: 6, height: 220 },
  14: { source: tutorialAssets.overlays.book, top: 40, left: 2, height: 260 },
  15: { source: tutorialAssets.overlays.versus, top: 130, left: 18, height: 140 },
  16: { source: tutorialAssets.overlays.versus, top: 130, left: 18, height: 140 },
};

export function getTutorialOverlayForIndex(index: number): TutorialOverlayLayout | null {
  return TUTORIAL_OVERLAY_BY_INDEX[index] ?? null;
}

export function resolveTutorialOverlaySize(
  overlay: TutorialOverlayLayout,
  screenWidth: number,
): { height: number; width: number; maxWidth: number } {
  const height = overlay.height;
  const width = overlay.width ?? height * TUTORIAL_OVERLAY_DEFAULTS.widthHeightRatio;
  const maxWidth = screenWidth * (overlay.maxWidthRatio ?? TUTORIAL_OVERLAY_DEFAULTS.maxWidthRatio);
  return { height, width, maxWidth };
}
