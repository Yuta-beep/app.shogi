import type { AiBattlePosition, AiBoardPiece } from '@/ai/model';
import type { ArrowDirection } from '@/constants/stage-fixed-arrow-cells';
import { parseArrowDirection } from '@/ai/engine/stage-fixed-arrow-tiles';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}

function readArrowTiles(position: AiBattlePosition): Record<string, unknown>[] {
  const boardState = asRecord(position.boardState) ?? {};
  const skillState = asRecord(boardState.skill_state ?? boardState.skillState) ?? {};
  const raw = skillState.board_arrow_tiles ?? skillState.boardArrowTiles;
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is Record<string, unknown> => asRecord(v) != null);
}

export function arrowDirectionAt(
  position: AiBattlePosition,
  row: number,
  col: number,
): ArrowDirection | null {
  for (const entry of readArrowTiles(position)) {
    const r = Number(entry.row);
    const c = Number(entry.col);
    if (r !== row || c !== col) continue;
    const remaining = Number(entry.remaining_turns ?? entry.remainingTurns ?? 1);
    if (Number.isFinite(remaining) && remaining <= 0) continue;
    return parseArrowDirection(entry.direction);
  }
  return null;
}

export function arrowSlideDestination(
  row: number,
  col: number,
  direction: ArrowDirection,
): { row: number; col: number } | null {
  switch (direction) {
    case 'up':
      return row > 0 ? { row: row - 1, col } : null;
    case 'down':
      return row < 8 ? { row: row + 1, col } : null;
    case 'left':
      return col > 0 ? { row, col: col - 1 } : null;
    case 'right':
      return col < 8 ? { row, col: col + 1 } : null;
    default:
      return null;
  }
}

export function buildArrowTileByCellMap(
  position: AiBattlePosition,
): Map<string, ArrowDirection> {
  const out = new Map<string, ArrowDirection>();
  for (const entry of readArrowTiles(position)) {
    const row = Number(entry.row);
    const col = Number(entry.col);
    const direction = parseArrowDirection(entry.direction);
    const remaining = Number(entry.remaining_turns ?? entry.remainingTurns ?? 1);
    if (!Number.isFinite(row) || !Number.isFinite(col) || !direction) continue;
    if (Number.isFinite(remaining) && remaining <= 0) continue;
    out.set(`${row}:${col}`, direction);
  }
  return out;
}

/** 矢印マスへの着手が、スライド先の障害で成立するか。 */
export function isArrowTileLandingLegal(input: {
  position: AiBattlePosition;
  actorSide: AiBoardPiece['side'];
  arrowRow: number;
  arrowCol: number;
  occupancy: Map<string, AiBoardPiece>;
}): boolean {
  const direction = arrowDirectionAt(input.position, input.arrowRow, input.arrowCol);
  if (!direction) return true;
  const slide = arrowSlideDestination(input.arrowRow, input.arrowCol, direction);
  if (!slide) return false;
  const slideOcc = input.occupancy.get(`${slide.row}:${slide.col}`);
  if (!slideOcc) return true;
  return slideOcc.side !== input.actorSide;
}
