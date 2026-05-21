export type ArrowDirection = 'up' | 'down' | 'left' | 'right';

export type StageFixedArrowCell = {
  row: number;
  col: number;
  direction: ArrowDirection;
};

/** ステージ23: 表示 (4,6)左 (4,7)下 (6,3)上 (6,4)右 */
export const STAGE_23_ARROW_CELLS: readonly StageFixedArrowCell[] = [
  { row: 3, col: 5, direction: 'left' },
  { row: 3, col: 6, direction: 'down' },
  { row: 5, col: 2, direction: 'up' },
  { row: 5, col: 3, direction: 'right' },
] as const;

/** ステージ28: 表示 (5,4)下 (5,6)上 */
export const STAGE_28_ARROW_CELLS: readonly StageFixedArrowCell[] = [
  { row: 4, col: 3, direction: 'down' },
  { row: 4, col: 5, direction: 'up' },
] as const;

/** ステージ29: 表示 (5,2)(5,7)左 (5,3)(5,8)右 */
export const STAGE_29_ARROW_CELLS: readonly StageFixedArrowCell[] = [
  { row: 4, col: 1, direction: 'left' },
  { row: 4, col: 2, direction: 'right' },
  { row: 4, col: 6, direction: 'left' },
  { row: 4, col: 7, direction: 'right' },
] as const;

/** ステージ34: 表示 (4,3)(4,7)下 (6,3)(6,7)上 */
export const STAGE_34_ARROW_CELLS: readonly StageFixedArrowCell[] = [
  { row: 3, col: 2, direction: 'down' },
  { row: 3, col: 6, direction: 'down' },
  { row: 5, col: 2, direction: 'up' },
  { row: 5, col: 6, direction: 'up' },
] as const;

/** ステージ38: 表示 (5,3)(5,7)右 */
export const STAGE_38_ARROW_CELLS: readonly StageFixedArrowCell[] = [
  { row: 4, col: 2, direction: 'right' },
  { row: 4, col: 6, direction: 'right' },
] as const;

/** ステージ41: 表示 (5,3)上 (5,7)下 */
export const STAGE_41_ARROW_CELLS: readonly StageFixedArrowCell[] = [
  { row: 4, col: 2, direction: 'up' },
  { row: 4, col: 6, direction: 'down' },
] as const;

/** ステージ45: 表示 (5,1)(5,3)(5,5)(5,7)(5,9)上 (5,2)(5,4)(5,6)(5,8)下 */
export const STAGE_45_ARROW_CELLS: readonly StageFixedArrowCell[] = [
  { row: 4, col: 0, direction: 'up' },
  { row: 4, col: 1, direction: 'down' },
  { row: 4, col: 2, direction: 'up' },
  { row: 4, col: 3, direction: 'down' },
  { row: 4, col: 4, direction: 'up' },
  { row: 4, col: 5, direction: 'down' },
  { row: 4, col: 6, direction: 'up' },
  { row: 4, col: 7, direction: 'down' },
  { row: 4, col: 8, direction: 'up' },
] as const;

/** ステージ49: 表示 (4,2)(4,4)(4,6)(4,8)下 (6,2)(6,4)(6,6)(6,8)上 */
export const STAGE_49_ARROW_CELLS: readonly StageFixedArrowCell[] = [
  { row: 3, col: 1, direction: 'down' },
  { row: 3, col: 3, direction: 'down' },
  { row: 3, col: 5, direction: 'down' },
  { row: 3, col: 7, direction: 'down' },
  { row: 5, col: 1, direction: 'up' },
  { row: 5, col: 3, direction: 'up' },
  { row: 5, col: 5, direction: 'up' },
  { row: 5, col: 7, direction: 'up' },
] as const;

export function fixedArrowCellsForStageNo(stageNo: number): readonly StageFixedArrowCell[] {
  if (stageNo === 23) return STAGE_23_ARROW_CELLS;
  if (stageNo === 28) return STAGE_28_ARROW_CELLS;
  if (stageNo === 29) return STAGE_29_ARROW_CELLS;
  if (stageNo === 34) return STAGE_34_ARROW_CELLS;
  if (stageNo === 38) return STAGE_38_ARROW_CELLS;
  if (stageNo === 41) return STAGE_41_ARROW_CELLS;
  if (stageNo === 45) return STAGE_45_ARROW_CELLS;
  if (stageNo === 49) return STAGE_49_ARROW_CELLS;
  return [];
}
