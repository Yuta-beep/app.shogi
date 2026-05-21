/** ステージ固有の永続×マス（盤面座標は 0 始まり。表示の「5行4列」= row 4, col 3）。 */
export const STAGE_10_FIXED_PIT_CELLS = [
  { row: 4, col: 3 },
  { row: 4, col: 4 },
  { row: 4, col: 5 },
] as const;

/** ステージ13: 表示 (5,1)(5,3)(5,7)(5,9) */
export const STAGE_13_FIXED_PIT_CELLS = [
  { row: 4, col: 0 },
  { row: 4, col: 2 },
  { row: 4, col: 6 },
  { row: 4, col: 8 },
] as const;

/** ステージ17: 表示 (5,2)(5,4)(5,6)(5,8) */
export const STAGE_17_FIXED_PIT_CELLS = [
  { row: 4, col: 1 },
  { row: 4, col: 3 },
  { row: 4, col: 5 },
  { row: 4, col: 7 },
] as const;

/** ステージ19: 表示 (5,5) */
export const STAGE_19_FIXED_PIT_CELLS = [{ row: 4, col: 4 }] as const;

/** ステージ20・21・26・36・48・49: 表示 (5,3)(5,7) */
export const STAGE_20_21_FIXED_PIT_CELLS = [
  { row: 4, col: 2 },
  { row: 4, col: 6 },
] as const;

/** ステージ22: 表示 (5,5) */
export const STAGE_22_FIXED_PIT_CELLS = [{ row: 4, col: 4 }] as const;

/** ステージ33: 表示 (5,1)(5,3)(5,5)(5,7)(5,9) */
export const STAGE_33_FIXED_PIT_CELLS = [
  { row: 4, col: 0 },
  { row: 4, col: 2 },
  { row: 4, col: 4 },
  { row: 4, col: 6 },
  { row: 4, col: 8 },
] as const;

/** ステージ41: 表示 (5,5) */
export const STAGE_41_FIXED_PIT_CELLS = [{ row: 4, col: 4 }] as const;

export function fixedPitCellsForStageNo(stageNo: number): readonly { row: number; col: number }[] {
  if (stageNo === 10) return STAGE_10_FIXED_PIT_CELLS;
  if (stageNo === 13) return STAGE_13_FIXED_PIT_CELLS;
  if (stageNo === 17) return STAGE_17_FIXED_PIT_CELLS;
  if (stageNo === 19) return STAGE_19_FIXED_PIT_CELLS;
  if (
    stageNo === 20 ||
    stageNo === 21 ||
    stageNo === 26 ||
    stageNo === 36 ||
    stageNo === 48 ||
    stageNo === 49
  ) {
    return STAGE_20_21_FIXED_PIT_CELLS;
  }
  if (stageNo === 22) return STAGE_22_FIXED_PIT_CELLS;
  if (stageNo === 33) return STAGE_33_FIXED_PIT_CELLS;
  if (stageNo === 41) return STAGE_41_FIXED_PIT_CELLS;
  return [];
}
