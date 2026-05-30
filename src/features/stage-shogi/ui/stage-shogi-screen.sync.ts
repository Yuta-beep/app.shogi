import { mapPiecesForSpringDragonAwakeningDisplay } from '@/ai/engine/spring-ryu-awakening';
import type { PieceCatalogItem } from '@/usecases/piece-info/load-piece-catalog-usecase';
import type { BattleCanonicalPosition } from '@/usecases/stage-battle/game-move-contract';
import { type BoardCell, normalizeHandsStateKeys } from '@/features/stage-shogi/domain/game-rules';
import type {
  ArrowCellDisplay,
  BoardPiece,
  PreservedMovedPiece,
} from '@/features/stage-shogi/ui/stage-shogi-screen.helpers';
import {
  applyATransformEffectToPieces,
  applyAbyssAuraEffectToPieces,
  applyChrysanthemumRevivalMarkToPieces,
  applyDarkVeilFromSkillStateToPieces,
  applyDeathCurseEffectToPieces,
  applyKirinImmunityShieldMarkToPieces,
  applyLightProtectionAuraEffectToPieces,
  applyMaiDanceRestrictionMarkToPieces,
  applyPrisonChainEffectToPieces,
  applyStunAuraEffectToPieces,
  applyYinYangSkillAuraDisplayToPieces,
  arrowCellsForDisplay,
  batsuHazardCellsForDisplay,
  handsFromCanonical,
  henEdgeHighlightCellsForDisplay,
  immobilizedKeysFromCanonical,
  movementRuleByCellFromCanonical,
  normalizeBoardPieceForDisplay,
  pieceCodeFromPlacement,
  piecesFromCanonicalPosition,
  poisonHazardCellsForDisplay,
  positionWithStageFixedBoardTiles,
  pruneDanceMovementRulesForDisplay,
  reconcileExtendedPieceHandsAgainstBoard,
  remapHandsStateToDisplayPieceCodes,
  rockObstacleCellsForDisplay,
  safeRoomHazardCellsForDisplay,
  thornHazardCellsForDisplay,
} from '@/features/stage-shogi/ui/stage-shogi-screen.helpers';
import type { PieceSfenMapping } from '@/features/stage-shogi/domain/piece-conversion';
import {
  enforcePersistentHazardCells,
  overlayPromotionFromOptimistic,
  preserveMovedPieceIdentity,
  reconcilePieceIdentity,
  restoreMissingPersistentHazardPieces,
} from '@/features/stage-shogi/ui/stage-shogi-screen.optimistic';

const PERSISTENT_SYNC_GUARD_CHARS = new Set([
  '毒',
  '沼',
  '映',
  '鏡',
  'あ',
  '牢',
  '柵',
  '峰',
  '嶺',
  '岩',
  '鉱',
  '墓',
  '霊',
]);

export function syncCanonicalState(params: {
  position: BattleCanonicalPosition;
  stageNo?: number;
  existingPieces: BoardPiece[];
  persistentHazards: readonly BoardPiece[];
  pieceCatalog: readonly PieceCatalogItem[];
  pieceSfenMapping: PieceSfenMapping;
  pieceDefsByCode: Partial<Record<string, PieceCatalogItem>>;
  promotedPieceDefsByCode: Partial<Record<string, PieceCatalogItem>>;
  preservedMovedPiece?: PreservedMovedPiece;
  optimisticBaseline?: BoardPiece[] | null;
}): {
  pieces: BoardPiece[];
  persistentHazards: BoardPiece[];
  poisonHazardCells: BoardCell[];
  rockObstacleCells: BoardCell[];
  batsuHazardCells: BoardCell[];
  arrowCells: ArrowCellDisplay[];
  thornHazardCells: BoardCell[];
  safeRoomHazardCells: BoardCell[];
  henEdgeHighlightCells: BoardCell[];
  hands: ReturnType<typeof handsFromCanonical>;
  sideToMove: BattleCanonicalPosition['sideToMove'];
  moveNo: number;
  stateHash: string | null | undefined;
  movementRuleByCell: Map<string, string>;
  immobilizedKeys: Set<string>;
} {
  const {
    position,
    stageNo,
    existingPieces,
    persistentHazards,
    pieceCatalog,
    pieceSfenMapping,
    pieceDefsByCode,
    promotedPieceDefsByCode,
    preservedMovedPiece,
    optimisticBaseline,
  } = params;
  const displayPosition = positionWithStageFixedBoardTiles(position, stageNo);
  const reconcileSource = optimisticBaseline ?? existingPieces;
  const parsedPieces = piecesFromCanonicalPosition(
    displayPosition,
    pieceSfenMapping,
    pieceDefsByCode,
    promotedPieceDefsByCode,
    reconcileSource,
  );
  const nextPieces = preserveMovedPieceIdentity(parsedPieces, preservedMovedPiece);
  const pieceDefsByCharEarly = Object.fromEntries(
    pieceCatalog.filter((it) => it.char).map((item) => [item.char, item]),
  ) as Partial<Record<string, PieceCatalogItem>>;
  const reconciledPieces = reconcilePieceIdentity(
    nextPieces,
    reconcileSource,
    pieceDefsByCharEarly,
  );
  const withPersistentHazards = restoreMissingPersistentHazardPieces(
    reconciledPieces,
    reconcileSource,
  );
  const withPromotionOverlay =
    optimisticBaseline && optimisticBaseline.length > 0
      ? overlayPromotionFromOptimistic(withPersistentHazards, optimisticBaseline)
      : withPersistentHazards;
  const withPersistentCells = enforcePersistentHazardCells(withPromotionOverlay, persistentHazards);
  const withDarkVeil = applyDarkVeilFromSkillStateToPieces(withPersistentCells, displayPosition);
  const withATransformEffect = applyATransformEffectToPieces(withDarkVeil, displayPosition);
  const withPrisonChain = applyPrisonChainEffectToPieces(withATransformEffect, displayPosition);
  const withStunAura = applyStunAuraEffectToPieces(withPrisonChain, displayPosition);
  const withAbyssAura = applyAbyssAuraEffectToPieces(withStunAura, displayPosition);
  const withChrysRevivalMark = applyChrysanthemumRevivalMarkToPieces(
    withAbyssAura,
    displayPosition,
  );
  const withLightProtectionAura = applyLightProtectionAuraEffectToPieces(
    withChrysRevivalMark,
    displayPosition,
  );
  const withDeathCurseAura = applyDeathCurseEffectToPieces(
    withLightProtectionAura,
    displayPosition,
  );
  const poisonHazardCells = poisonHazardCellsForDisplay(displayPosition);
  const rockObstacleCells = rockObstacleCellsForDisplay(displayPosition);
  const batsuHazardCells = batsuHazardCellsForDisplay(displayPosition);
  const arrowCells = arrowCellsForDisplay(displayPosition);
  const thornHazardCells = thornHazardCellsForDisplay(displayPosition);
  const safeRoomHazardCells = safeRoomHazardCellsForDisplay(displayPosition);
  const henEdgeHighlightCells = henEdgeHighlightCellsForDisplay(displayPosition);
  const rawMovementRuleByCell = movementRuleByCellFromCanonical(displayPosition);
  const immobilizedKeys = immobilizedKeysFromCanonical(displayPosition);
  const nextHands = remapHandsStateToDisplayPieceCodes(
    normalizeHandsStateKeys(handsFromCanonical(displayPosition)),
    pieceCatalog,
  );
  const reconciledHands = reconcileExtendedPieceHandsAgainstBoard(nextHands, withPromotionOverlay);
  const stabilizedPieces = enforcePersistentHazardCells(withDeathCurseAura, persistentHazards);
  const pieceDefsByChar = Object.fromEntries(
    pieceCatalog.filter((it) => it.char).map((item) => [item.char, item]),
  ) as Partial<Record<string, PieceCatalogItem>>;
  const withNormalizedIdentity = stabilizedPieces.map((p) =>
    normalizeBoardPieceForDisplay(p, pieceDefsByChar),
  );
  const withSpringDragonAwakening = mapPiecesForSpringDragonAwakeningDisplay(
    withNormalizedIdentity,
    pieceDefsByChar,
  );
  const withYinYangSkillAura = applyYinYangSkillAuraDisplayToPieces(withSpringDragonAwakening);
  const movementRuleByCell = pruneDanceMovementRulesForDisplay(
    rawMovementRuleByCell,
    withYinYangSkillAura,
  );
  const withMaiDanceMark = applyMaiDanceRestrictionMarkToPieces(
    withYinYangSkillAura,
    movementRuleByCell,
  );
  const withKirinShieldMark = applyKirinImmunityShieldMarkToPieces(withMaiDanceMark);
  const nextPersistentHazards = withKirinShieldMark.filter((p) =>
    PERSISTENT_SYNC_GUARD_CHARS.has(p.char),
  );

  return {
    pieces: withKirinShieldMark,
    persistentHazards: nextPersistentHazards,
    poisonHazardCells,
    rockObstacleCells,
    batsuHazardCells,
    arrowCells,
    thornHazardCells,
    safeRoomHazardCells,
    henEdgeHighlightCells,
    hands: reconciledHands,
    sideToMove: position.sideToMove,
    moveNo: position.turnNumber,
    stateHash: position.stateHash,
    movementRuleByCell,
    immobilizedKeys,
  };
}
