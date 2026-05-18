import type { ImageSourcePropType } from 'react-native';

/** HTML 版 gacha_room と同種の画像・演出動画 */
export const gachaRoomAssets = {
  backButton: require('../../assets/gacha/戻る.png'),
  draw1: require('../../assets/gacha/draw-1.png'),
  draw0: require('../../assets/gacha/draw-0.png'),
  drawGold: require('../../assets/gacha/draw-gold.png'),
  videos: {
    /** 外れ */
    miss: require('../../assets/gacha/ガチャ1.mp4'),
    /** 当たり駒 */
    hit: require('../../assets/gacha/ガチャ2.mp4'),
  },
  /**
   * バナー画像は `assets/gacha/` 直下に配置（ASCII ファイル名でバンドル互換性を確保）
   * うかんむり／ひへん／しんにょう／漢検1級の見た目は各 PNG の内容で差し替え
   */
  bannerByKey: {
    ukanmuri: require('../../assets/gacha/banner-ukanmuri.png'),
    hiHen: require('../../assets/gacha/banner-hihen.png'),
    shinnyo: require('../../assets/gacha/banner-shinnyo.png'),
    kanken1: require('../../assets/gacha/banner-kanken1.png'),
  } as Record<string, ImageSourcePropType>,
} as const;

/** API と過去モックの表記ゆれを正規化 */
const BANNER_KEY_ALIASES: Record<string, string> = {
  hihen: 'hiHen',
};

export function resolveGachaBannerKey(key: string): string {
  return BANNER_KEY_ALIASES[key] ?? key;
}

/** バンドル済みバナーがあるか（このキーならリモートURLよりローカルを優先する） */
export function hasBundledGachaBanner(key: string): boolean {
  const k = resolveGachaBannerKey(key);
  return Object.prototype.hasOwnProperty.call(gachaRoomAssets.bannerByKey, k);
}

/**
 * ガチャ一覧・背景用。assets にバナーがある場合は常にバンドル画像を優先する。
 * （API の imageSignedUrl が期限切れ・未設定でもローカル画像が表示される）
 */
export function bannerImageSource(
  key: string,
  imageSignedUrl?: string | null,
): ImageSourcePropType | { uri: string } {
  const resolved = resolveGachaBannerKey(key);
  const local = gachaRoomAssets.bannerByKey[resolved];
  if (local != null) {
    return local;
  }
  if (imageSignedUrl && imageSignedUrl.length > 0) {
    return { uri: imageSignedUrl };
  }
  return gachaRoomAssets.draw1;
}
