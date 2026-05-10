import type { AiBattleMove, AiBattlePosition, AiPieceDefinition } from '@/ai/model';
import { normalizeBattleMove } from '@/ai/model';
import { generateLegalMoves } from '@/ai/engine/legal-moves';
import { moveEquals } from '@/ai/engine/shared';

export function assertMoveAllowedBySessionCatalog(input: {
  position: AiBattlePosition;
  pieceCatalog: AiPieceDefinition[];
  move: AiBattleMove;
  actor: 'player' | 'enemy';
}) {
  const move = normalizeBattleMove(input.move);
  const moveForMatch =
    move.notation === 'time_normal'
      ? {
          ...move,
          notation: null,
        }
      : move;
  const legal = generateLegalMoves({
    position: input.position,
    pieceCatalog: input.pieceCatalog,
  });

  if (legal.sideToMove !== input.actor) {
    throw new Error(
      `guardrail rejected move: expected ${legal.sideToMove} turn but got ${input.actor}`,
    );
  }

  const matched = legal.legalMoves.find((candidate) => moveEquals(candidate, moveForMatch));
  if (!matched) {
    throw new Error('guardrail rejected move: move is outside session catalog legal range');
  }

  const requestedSkillNotation =
    move.notation === 'time_skill' ||
    move.notation === 'time_skill_only' ||
    move.notation === 'house_skill_only'
      ? move.notation
      : typeof move.notation === 'string' && move.notation.startsWith('satori_stun:')
        ? move.notation
        : typeof move.notation === 'string' && move.notation.startsWith('heart_protect:')
          ? move.notation
          : null;
  const legalSkillNotation =
    matched.notation === 'time_skill' ||
    matched.notation === 'time_skill_only' ||
    matched.notation === 'house_skill_only'
      ? matched.notation
      : typeof matched.notation === 'string' && matched.notation.startsWith('satori_stun:')
        ? matched.notation
        : typeof matched.notation === 'string' && matched.notation.startsWith('heart_protect:')
          ? matched.notation
          : null;

  if (requestedSkillNotation !== legalSkillNotation) {
    throw new Error('guardrail rejected move: skill annotation does not match legal move');
  }

  return matched;
}
