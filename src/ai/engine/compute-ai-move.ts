import type { AiBattleMove, AiBattlePosition, AiPieceDefinition, Side } from '@/ai/model';
import type { BattleAiTurn } from '@/usecases/stage-battle/game-move-contract';
import { toBasePieceCode } from '@/ai/model';
import { assertMoveAllowedBySessionCatalog } from '@/ai/engine/guardrails';
import { PIECE_VALUES } from '@/ai/engine/shared';
import { applyMove } from '@/ai/engine/apply-move';
import { generateLegalMoves } from '@/ai/engine/legal-moves';

function moveScore(move: AiBattleMove, side: Side): number {
  const captured = toBasePieceCode(move.capturedPieceCode);
  const pieceCode = toBasePieceCode(move.pieceCode) ?? 'FU';
  const forward = side === 'enemy' ? move.toRow : 8 - move.toRow;
  const captureValue = captured ? (PIECE_VALUES[captured] ?? 150) : 0;
  const selfValue = PIECE_VALUES[pieceCode] ?? 100;
  const promotionBonus = move.promote ? 120 : 0;
  return captureValue * 10 + promotionBonus + selfValue + forward * 4;
}

export function computeAiMove(input: {
  position: AiBattlePosition;
  pieceCatalog: AiPieceDefinition[];
}): BattleAiTurn {
  const startedAt = Date.now();
  const legal = generateLegalMoves({
    position: input.position,
    pieceCatalog: input.pieceCatalog,
  });
  if (legal.legalMoves.length === 0) {
    return {
      selectedMove: null,
      skillTriggered: false,
      meta: null,
      position: input.position,
      game: { status: 'finished', result: 'player_win', winnerSide: 'player' as const },
    };
  }

  let selectedMove = legal.legalMoves[0]!;
  let bestScore = moveScore(selectedMove, 'enemy');
  for (let i = 1; i < legal.legalMoves.length; i += 1) {
    const candidate = legal.legalMoves[i]!;
    const score = moveScore(candidate, 'enemy');
    if (score > bestScore) {
      selectedMove = candidate;
      bestScore = score;
    }
  }
  assertMoveAllowedBySessionCatalog({
    position: input.position,
    pieceCatalog: input.pieceCatalog,
    move: selectedMove,
    actor: 'enemy',
  });
  const committed = applyMove({
    position: input.position,
    pieceCatalog: input.pieceCatalog,
    move: selectedMove,
  });

  return {
    selectedMove: committed.move,
    skillTriggered: committed.skillTriggered,
    meta: {
      engineVersion: 'local-ts',
      thinkMs: Date.now() - startedAt,
      searchedNodes: legal.legalMoves.length,
      searchDepth: 1,
      evalCp: bestScore,
      candidateCount: legal.legalMoves.length,
      configApplied: {},
    },
    position: committed.position,
    game: committed.game,
  };
}
