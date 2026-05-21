import type { AiBattlePosition } from '@/ai/model';
import { fixedPitCellsForStageNo } from '@/constants/stage-fixed-pit-cells';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}

export function isPermanentBoardHazardEntry(entry: Record<string, unknown>): boolean {
  if (entry.permanent === true || entry.stage_fixed === true) return true;
  const remaining = Number(entry.remaining_turns ?? entry.remainingTurns ?? 0);
  return Number.isFinite(remaining) && remaining >= 999;
}

export function stageFixedPitHazardEntries(
  stageNo: number,
): Record<string, unknown>[] {
  return fixedPitCellsForStageNo(stageNo).map(({ row, col }) => ({
    row,
    col,
    hazard_type: 'pit_cell',
    affects_side: 'enemy',
    remaining_turns: 999,
    permanent: true,
    stage_fixed: true,
  }));
}

/** ステージ固定×マスを skill_state.board_hazards にマージ（既存の同座標 stage_fixed は置換）。 */
export function mergeStageFixedPitHazardsIntoPosition(
  position: AiBattlePosition,
  stageNo: number,
): AiBattlePosition {
  const entries = stageFixedPitHazardEntries(stageNo);
  if (entries.length === 0) return position;

  const boardState = { ...(asRecord(position.boardState) ?? {}) };
  const skillState = {
    ...(asRecord(boardState.skill_state ?? boardState.skillState) ?? {}),
  };
  const prevRaw = skillState.board_hazards ?? skillState.boardHazards;
  const prev = Array.isArray(prevRaw) ? [...prevRaw] : [];
  const withoutStageFixed = prev.filter((raw) => {
    const entry = asRecord(raw);
    return entry?.stage_fixed !== true;
  });
  skillState.board_hazards = [...withoutStageFixed, ...entries];
  delete skillState.boardHazards;
  boardState.skill_state = skillState;
  return {
    ...position,
    boardState,
  };
}
