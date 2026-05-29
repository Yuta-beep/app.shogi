import { toBasePieceCode } from '@/ai/model/move';
import { CODE_TO_CHAR } from '@/features/stage-shogi/domain/piece-conversion';

import type { SkillVisualEffect, SkillVisualEffectPlacement } from './skill-visual-effect';

export function boardSkillFxPlacement(row: number, col: number): SkillVisualEffectPlacement {
  return { type: 'board', row, col };
}

export function handSkillFxPlacement(
  side: 'player' | 'enemy',
  pieceCode: string,
  slotIndex?: number,
): SkillVisualEffectPlacement {
  return {
    type: 'hand',
    side,
    pieceCode: pieceCode.toUpperCase(),
    ...(slotIndex != null && slotIndex >= 0 ? { slotIndex } : {}),
  };
}

export function appendBoardSkillVisualEffects(
  bucket: SkillVisualEffect[],
  input: {
    idPrefix: string;
    seq: number;
    pieceChar: string;
    cells: readonly { row: number; col: number }[];
  },
): number {
  if (input.cells.length === 0) return input.seq;
  bucket.push(
    createSkillVisualEffect({
      id: `${input.idPrefix}-b${input.seq}`,
      pieceChar: input.pieceChar,
      placements: input.cells.map((cell) => boardSkillFxPlacement(cell.row, cell.col)),
    }),
  );
  return input.seq + 1;
}

export function appendHandSkillVisualEffects(
  bucket: SkillVisualEffect[],
  input: {
    idPrefix: string;
    seq: number;
    pieceChar: string;
    entries: readonly { side: 'player' | 'enemy'; pieceCode: string; slotIndex?: number }[];
  },
): number {
  if (input.entries.length === 0) return input.seq;
  bucket.push(
    createSkillVisualEffect({
      id: `${input.idPrefix}-h${input.seq}`,
      pieceChar: input.pieceChar,
      placements: input.entries.map((entry) =>
        handSkillFxPlacement(entry.side, entry.pieceCode, entry.slotIndex),
      ),
    }),
  );
  return input.seq + 1;
}

export function handSlotIndexBeforeRemoval(
  hands: { player: Record<string, number>; enemy: Record<string, number> },
  side: 'player' | 'enemy',
  pieceCode: string,
): number {
  const bag = hands[side] ?? {};
  const keys = Object.keys(bag)
    .filter((key) => {
      const qty = bag[key];
      return typeof qty === 'number' && Number.isFinite(qty) && qty > 0;
    })
    .sort();
  const normalized = pieceCode.toUpperCase();
  const found = keys.findIndex((key) => key.toUpperCase() === normalized);
  return found >= 0 ? found : Math.max(0, keys.length - 1);
}

export function resolveSkillFxPieceChar(input: {
  char?: string | null;
  pieceCode?: string | null;
}): string {
  const trimmed = input.char?.trim();
  if (trimmed) return trimmed;
  const base = toBasePieceCode(input.pieceCode);
  if (base && CODE_TO_CHAR[base]) return CODE_TO_CHAR[base];
  return input.pieceCode?.trim() ?? '?';
}

export function createSkillVisualEffect(input: {
  id: string;
  pieceChar: string;
  placements: SkillVisualEffectPlacement[];
}): SkillVisualEffect {
  return {
    id: input.id,
    pieceChar: input.pieceChar,
    placements: input.placements,
  };
}

export function splitSkillVisualPlacements(effect: SkillVisualEffect): {
  board: { row: number; col: number }[];
  hand: { side: 'player' | 'enemy'; pieceCode: string; slotIndex?: number }[];
} {
  const board: { row: number; col: number }[] = [];
  const hand: { side: 'player' | 'enemy'; pieceCode: string; slotIndex?: number }[] = [];
  for (const placement of effect.placements) {
    if (placement.type === 'board') {
      board.push({ row: placement.row, col: placement.col });
    } else {
      hand.push({
        side: placement.side,
        pieceCode: placement.pieceCode,
        slotIndex: placement.slotIndex,
      });
    }
  }
  return { board, hand };
}
