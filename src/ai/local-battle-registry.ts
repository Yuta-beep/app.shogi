import type { PieceCatalogItem } from '@/usecases/piece-info/load-piece-catalog-usecase';
import type {
  BattleCanonicalPosition,
  BattleGameStatus,
  BattleMove,
} from '@/usecases/stage-battle/game-move-contract';
import type { StageBattleSessionStart } from '@/usecases/stage-battle/stage-battle-session-contract';
import type {
  AiBattleGameStatus,
  AiBattlePosition,
  AiPieceDefinition,
  AiStageBattleSession,
} from '@/ai/model';
import {
  normalizeBattleGameStatus,
  normalizeBattlePosition,
  normalizePieceCatalog,
  normalizeStageBattleSession,
} from '@/ai/model';
import { mergeStageFixedArrowTilesIntoPosition } from '@/ai/engine/stage-fixed-arrow-tiles';
import { mergeStageFixedPitHazardsIntoPosition } from '@/ai/engine/stage-fixed-hazards';
import { preparePieceCatalogForBattleAndDisplay } from '@/features/piece-info/lib/piece-catalog-display';

export type LocalBattleGameRecord = {
  gameId: string;
  playerId: string;
  stageNo?: number;
  pieceCatalog: AiPieceDefinition[];
  position: AiBattlePosition;
  game: AiBattleGameStatus;
  aiMoveHistory: BattleMove[];
  startedAt: string;
};

let pieceCatalog: AiPieceDefinition[] = [];
let activeStageSession: AiStageBattleSession | null = null;
const localGames = new Map<string, LocalBattleGameRecord>();
let localGameSequence = 1;

export function setLocalBattlePieceCatalog(items: PieceCatalogItem[]) {
  pieceCatalog = normalizePieceCatalog(preparePieceCatalogForBattleAndDisplay(items));
}

export function getLocalBattlePieceCatalog(): AiPieceDefinition[] {
  return pieceCatalog.map((item) => ({
    ...item,
    moveVectors: item.moveVectors.map((vector) => ({ ...vector })),
    moveRules: item.moveRules?.map((rule) => ({ ...rule, params: { ...rule.params } })) ?? [],
    moveConstraints: item.moveConstraints ? { ...item.moveConstraints } : null,
  }));
}

export function registerActiveStageSession(session: StageBattleSessionStart) {
  activeStageSession = normalizeStageBattleSession(session);
}

export function getActiveStageSession(): AiStageBattleSession | null {
  return activeStageSession ? normalizeStageBattleSession(activeStageSession) : null;
}

export function clearActiveStageSession() {
  activeStageSession = null;
}

function withStageFixedBoardTiles(
  position: BattleCanonicalPosition,
  stageNo?: number,
): AiBattlePosition {
  const normalized = normalizeBattlePosition(position);
  if (!stageNo || !Number.isInteger(stageNo) || stageNo <= 0) return normalized;
  return mergeStageFixedArrowTilesIntoPosition(
    mergeStageFixedPitHazardsIntoPosition(normalized, stageNo),
    stageNo,
  );
}

export function createLocalBattleGame(input: {
  playerId: string;
  stageNo?: number;
  position: BattleCanonicalPosition;
  game?: BattleGameStatus;
}): LocalBattleGameRecord {
  const gameId = `local-game-${localGameSequence++}`;
  const record: LocalBattleGameRecord = {
    gameId,
    playerId: input.playerId,
    stageNo: input.stageNo,
    pieceCatalog: getLocalBattlePieceCatalog(),
    position: withStageFixedBoardTiles(input.position, input.stageNo),
    game: normalizeBattleGameStatus(input.game),
    aiMoveHistory: [],
    startedAt: new Date().toISOString(),
  };
  localGames.set(gameId, record);
  return record;
}

export function getLocalBattleGame(gameId: string): LocalBattleGameRecord | null {
  const record = localGames.get(gameId);
  if (!record) return null;
  return {
    ...record,
    pieceCatalog: getLocalBattlePieceCatalog(),
    position: withStageFixedBoardTiles(record.position, record.stageNo),
    game: normalizeBattleGameStatus(record.game),
    aiMoveHistory: record.aiMoveHistory.map((move) => ({ ...move })),
  };
}

export function updateLocalBattleGame(
  gameId: string,
  updater: (record: LocalBattleGameRecord) => LocalBattleGameRecord,
): LocalBattleGameRecord {
  const current = localGames.get(gameId);
  if (!current) {
    throw new Error(`local battle game not found: ${gameId}`);
  }
  const next = updater({
    ...current,
    pieceCatalog: getLocalBattlePieceCatalog(),
    position: withStageFixedBoardTiles(current.position, current.stageNo),
    game: normalizeBattleGameStatus(current.game),
    aiMoveHistory: current.aiMoveHistory.map((move) => ({ ...move })),
  });
  const merged: LocalBattleGameRecord = {
    ...next,
    position: withStageFixedBoardTiles(next.position, next.stageNo),
    aiMoveHistory: next.aiMoveHistory.map((move) => ({ ...move })),
  };
  localGames.set(gameId, merged);
  return merged;
}

export function clearLocalBattleGames() {
  localGames.clear();
}

export function resetLocalBattleRegistry() {
  pieceCatalog = [];
  activeStageSession = null;
  localGames.clear();
  localGameSequence = 1;
}
