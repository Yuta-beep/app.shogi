import type { AiBattlePosition } from '@/ai/model';
import {
  fixedArrowCellsForStageNo,
  type ArrowDirection,
} from '@/constants/stage-fixed-arrow-cells';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}

export function stageFixedArrowTileEntries(stageNo: number): Record<string, unknown>[] {
  return fixedArrowCellsForStageNo(stageNo).map(({ row, col, direction }) => ({
    row,
    col,
    direction,
    permanent: true,
    stage_fixed: true,
    remaining_turns: 999,
  }));
}

/** ステージ固定の矢印マスを skill_state.board_arrow_tiles にマージ。 */
export function mergeStageFixedArrowTilesIntoPosition(
  position: AiBattlePosition,
  stageNo: number,
): AiBattlePosition {
  const entries = stageFixedArrowTileEntries(stageNo);
  if (entries.length === 0) return position;

  const boardState = { ...(asRecord(position.boardState) ?? {}) };
  const skillState = {
    ...(asRecord(boardState.skill_state ?? boardState.skillState) ?? {}),
  };
  const prevRaw = skillState.board_arrow_tiles ?? skillState.boardArrowTiles;
  const prev = Array.isArray(prevRaw) ? [...prevRaw] : [];
  const withoutStageFixed = prev.filter((raw) => {
    const entry = asRecord(raw);
    return entry?.stage_fixed !== true;
  });
  skillState.board_arrow_tiles = [...withoutStageFixed, ...entries];
  delete skillState.boardArrowTiles;
  boardState.skill_state = skillState;
  return {
    ...position,
    boardState,
  };
}

export function parseArrowDirection(value: unknown): ArrowDirection | null {
  const dir = String(value ?? '').toLowerCase();
  if (dir === 'up' || dir === 'down' || dir === 'left' || dir === 'right') return dir;
  return null;
}
