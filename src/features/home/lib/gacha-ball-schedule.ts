/** ガチャ玉の表示色が切り替わる区間（ミリ秒）: 4時間 */
export const GACHA_BALL_PERIOD_MS = 4 * 60 * 60 * 1000;

/** 白・青・赤・金・黒の出現ウェイト（合計100） */
export const GACHA_BALL_COLOR_WEIGHTS = [60, 20, 10, 7, 3] as const;

function hashPeriodToUint32(period: number): number {
  let h = period >>> 0;
  h = Math.imul(h ^ 0x9e3779b1, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * 現在時刻が属する「4時間区間」に対応する色インデックス（0..4）。
 * 各色の出現は {@link GACHA_BALL_COLOR_WEIGHTS} に従います。
 * 同じ区間では常に同じ値になり、区間が変わると決定的に別の抽選結果になります（UTC 基準のエポック整列）。
 */
export function gachaBallColorIndexForCurrentPeriod(nowMs: number = Date.now()): number {
  const period = Math.floor(nowMs / GACHA_BALL_PERIOD_MS);
  const h = hashPeriodToUint32(period);
  const roll = h % 100;
  let cum = 0;
  for (let i = 0; i < GACHA_BALL_COLOR_WEIGHTS.length; i++) {
    cum += GACHA_BALL_COLOR_WEIGHTS[i]!;
    if (roll < cum) return i;
  }
  return GACHA_BALL_COLOR_WEIGHTS.length - 1;
}
