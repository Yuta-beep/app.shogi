import { Image as RNImage, type ImageSourcePropType } from 'react-native';

/** 対戦モード画面：スクロールレイアウト */
export const ONLINE_MATCH_MODE_HORIZONTAL_INSET = 16;
export const ONLINE_MATCH_MODE_CONTENT_PADDING_TOP = 88;
export const ONLINE_MATCH_MODE_CONTENT_PADDING_BOTTOM = 32;

/** レートランキングの縦位置（負で上方向・LAN とは独立） */
export const ONLINE_MATCH_MODE_RANKING_OFFSET_Y = -48;

export type OnlineMatchButtonLayout = {
  /** コンテンツ幅に対する表示幅の比率 */
  displayWidthRatio: number;
  /** 表示矩形の各辺からタップ範囲を縮める比率（透明余白対策） */
  hitInsetRatio: { x: number; y: number };
  /** スクロール内での縦位置調整（負で上方向・ボタンごとに別指定） */
  offsetY?: number;
};

/** インターネット対戦ボタン（縦位置は offsetY で別指定） */
export const ONLINE_MATCH_MODE_INTERNET_BUTTON: OnlineMatchButtonLayout = {
  displayWidthRatio: 0.92,
  hitInsetRatio: { x: 0.14, y: 0.1 },
  offsetY: -40,
};

/** LAN 対戦ボタン（縦位置は offsetY で別指定） */
export const ONLINE_MATCH_MODE_LAN_BUTTON: OnlineMatchButtonLayout = {
  displayWidthRatio: 0.92,
  hitInsetRatio: { x: 0.14, y: 0.1 },
  offsetY: -120,
};

export function resolveImageAspectRatio(source: ImageSourcePropType): number {
  const resolved = RNImage.resolveAssetSource(source);
  if (!resolved?.width || !resolved?.height) return 3;
  return resolved.width / resolved.height;
}

export function resolveOnlineMatchButtonMetrics(
  source: ImageSourcePropType,
  contentWidth: number,
  layout: OnlineMatchButtonLayout,
) {
  const aspectRatio = resolveImageAspectRatio(source);
  const displayWidth = contentWidth * layout.displayWidthRatio;
  const displayHeight = displayWidth / aspectRatio;
  const hitWidth = displayWidth * (1 - layout.hitInsetRatio.x * 2);
  const hitHeight = displayHeight * (1 - layout.hitInsetRatio.y * 2);

  return { displayWidth, displayHeight, hitWidth, hitHeight, aspectRatio };
}
