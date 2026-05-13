import type { Side } from '@/features/stage-shogi/domain/game-rules';

type SkillStatus = Record<string, unknown>;

function normalizeSide(value: unknown): Side {
  return String(value ?? 'player') === 'enemy' ? 'enemy' : 'player';
}

function asSkillState(boardState: Record<string, unknown> | undefined): Record<string, unknown> {
  const raw = boardState?.skill_state ?? boardState?.skillState;
  return raw && typeof raw === 'object'
    ? ({ ...(raw as Record<string, unknown>) } as Record<string, unknown>)
    : {};
}

export function readSkillStatePieceStatuses(
  boardState: Record<string, unknown> | undefined,
): SkillStatus[] {
  const skillState = asSkillState(boardState);
  const raw = (skillState.piece_statuses ?? skillState.pieceStatuses) as unknown;
  return Array.isArray(raw) ? [...raw] : [];
}

export function writeSkillStatePieceStatuses(
  boardState: Record<string, unknown> | undefined,
  statuses: SkillStatus[],
): void {
  if (!boardState) return;
  const skillState = asSkillState(boardState);
  skillState.piece_statuses = statuses;
  boardState.skill_state = skillState;
}

export function readFollowupCellForSide(
  boardState: Record<string, unknown> | undefined,
  side: Side,
  statusType: string,
): { row: number; col: number } | null {
  for (const raw of readSkillStatePieceStatuses(boardState)) {
    const st = (raw ?? {}) as Record<string, unknown>;
    if (String(st.status_type ?? st.statusType ?? '') !== statusType) continue;
    if (normalizeSide(st.side) !== side) continue;
    const remaining = Number(st.remaining_turns ?? st.remainingTurns ?? 0);
    if (!Number.isFinite(remaining) || remaining <= 0) continue;
    const row = Number(st.row);
    const col = Number(st.col);
    if (!Number.isFinite(row) || !Number.isFinite(col)) continue;
    return { row, col };
  }
  return null;
}

export function hasActiveCellStatus(
  boardState: Record<string, unknown> | undefined,
  side: Side,
  statusType: string,
  row: number,
  col: number,
): boolean {
  for (const raw of readSkillStatePieceStatuses(boardState)) {
    const st = (raw ?? {}) as Record<string, unknown>;
    if (String(st.status_type ?? st.statusType ?? '') !== statusType) continue;
    if (normalizeSide(st.side) !== side) continue;
    const remaining = Number(st.remaining_turns ?? st.remainingTurns ?? 0);
    if (!Number.isFinite(remaining) || remaining <= 0) continue;
    if (Number(st.row) === row && Number(st.col) === col) return true;
  }
  return false;
}

export function removeCellStatus(
  boardState: Record<string, unknown> | undefined,
  side: Side,
  statusType: string,
  row: number,
  col: number,
): void {
  const next = readSkillStatePieceStatuses(boardState).filter((entry) => {
    const st = (entry ?? {}) as Record<string, unknown>;
    if (String(st.status_type ?? st.statusType ?? '') !== statusType) return true;
    if (normalizeSide(st.side) !== side) return true;
    return Number(st.row) !== row || Number(st.col) !== col;
  });
  writeSkillStatePieceStatuses(boardState, next);
}
