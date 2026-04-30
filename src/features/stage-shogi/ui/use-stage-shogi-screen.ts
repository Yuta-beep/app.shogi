import { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import { setLocalBattlePieceCatalog } from '@/ai/local-battle-registry';
import {
  addHandPiece,
  BoardCell,
  createEmptyHandsState,
  getHandCount,
  getLegalTargetsFromVectors,
  HandsState,
  Side,
} from '@/features/stage-shogi/domain/game-rules';
import {
  CHAR_TO_CODE,
  CODE_TO_CHAR,
  PROMOTED_CODE_TO_CHAR,
  createPieceSfenMapping,
} from '@/features/stage-shogi/domain/piece-conversion';
import type { PromotionImageFlash } from '@/features/stage-shogi/ui/components/stage-shogi-board';
import { useStageBattleScreen } from '@/features/stage-shogi/ui/use-stage-battle-screen';
import {
  InspectingPieceState,
  isIllegalMoveError,
  normalizeSkillName,
  resolveInspectMoveDescription,
  resolveInspectSkillDescription,
  toUserFacingBattleError,
} from '@/features/stage-shogi/ui/stage-shogi-screen.presenters';
import {
  BOARD_SIZE,
  BoardPiece,
  PERSISTENT_SYNC_GUARD_CHARS,
  PreservedMovedPiece,
  TrustedBoardEndpoints,
  applyMovementRuleToTargets,
  buildBoardState,
  buildPreservedMovedPieceForPlayer,
  buildSfen,
  collectStandardBaseCodesForLocalPromotedImage,
  computePiecesAfterOptimisticMove,
  enforcePersistentHazardCells,
  findPieceAt,
  getPieceImageSource,
  hasAdjacentEnemyPiece,
  isGameAlreadyFinishedError,
  isSelfCaptureLikeMove,
  legalMovesForBoardPiece,
  legalMovesForDropPiece,
  legalMovesToTarget,
  localPromotedModuleFromBaseCodeCandidates,
  patchHandsForStarReturnSkill,
  pieceCodeFromPlacement,
  pieceCharFromCode,
  resolveBattleMovePlacements,
  syncCanonicalState,
  uniqueTargetsFromMoves,
} from '@/features/stage-shogi/ui/stage-shogi-screen.helpers';
import { createLoadPieceCatalogUseCase } from '@/usecases/piece-info/create-piece-info-usecases';
import type { PieceCatalogItem } from '@/usecases/piece-info/load-piece-catalog-usecase';
import { createClaimStageClearRewardUseCase } from '@/usecases/stage-battle/create-stage-battle-usecases';
import { CommitGameMoveUseCase } from '@/usecases/stage-battle/commit-game-move-usecase';
import { CreateGameUseCase } from '@/usecases/stage-battle/create-game-usecase';
import {
  BattleCanonicalPosition,
  BattleGameStatus,
  BattleMove,
} from '@/usecases/stage-battle/game-move-contract';
import { LoadGameLegalMovesUseCase } from '@/usecases/stage-battle/load-game-legal-moves-usecase';
import { LoadGameStateUseCase } from '@/usecases/stage-battle/load-game-state-usecase';
import { RequestAiMoveUseCase } from '@/usecases/stage-battle/request-ai-move-usecase';

export type PendingPromotion = {
  promoteMove: BattleMove;
  nonPromoteMove: BattleMove;
  boardFromRow: number;
  boardFromCol: number;
  boardToRow: number;
  boardToCol: number;
};

export type TimeActionMode = 'skill' | 'normal';

export function useStageShogiScreen(stageParam: string | undefined, userId?: string) {
  const { snapshot, isLoading, loadError } = useStageBattleScreen(stageParam, userId);
  const [failedImageKeys, setFailedImageKeys] = useState<Record<string, true>>({});
  const [pieces, setPieces] = useState<BoardPiece[]>([]);
  const piecesRenderRef = useRef<BoardPiece[]>([]);
  piecesRenderRef.current = pieces;
  const [boardSpriteEpoch, setBoardSpriteEpoch] = useState(0);
  const [sideToMove, setSideToMove] = useState<Side>('player');
  const [moveNo, setMoveNo] = useState(1);
  const [gameId, setGameId] = useState<string | null>(null);
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<BoardCell | null>(null);
  const [selectedDropPieceCode, setSelectedDropPieceCode] = useState<string | null>(null);
  const [legalTargets, setLegalTargets] = useState<BoardCell[]>([]);
  const [aiPreviewTarget, setAiPreviewTarget] = useState<BoardCell | null>(null);
  const [playerLegalMoves, setPlayerLegalMoves] = useState<BattleMove[]>([]);
  const [enemyPreviewTargets, setEnemyPreviewTargets] = useState<BoardCell[]>([]);
  const [poisonHazardCells, setPoisonHazardCells] = useState<BoardCell[]>([]);
  const [isLoadingPlayerLegalMoves, setIsLoadingPlayerLegalMoves] = useState(false);
  const [hands, setHands] = useState<HandsState>(createEmptyHandsState());
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null);
  const [pendingTimeActionCell, setPendingTimeActionCell] = useState<BoardCell | null>(null);
  const [timeActionMode, setTimeActionMode] = useState<TimeActionMode | null>(null);
  const [promotionImageFlash, setPromotionImageFlash] = useState<PromotionImageFlash | null>(null);
  const [stateHash, setStateHash] = useState<string | null>(null);
  const [pieceCatalog, setPieceCatalog] = useState<PieceCatalogItem[]>([]);
  const [winner, setWinner] = useState<Side | null>(null);
  const [clearRewardText, setClearRewardText] = useState<string | null>(null);
  const [skillActivationText, setSkillActivationText] = useState<string | null>(null);
  const [inspectingPiece, setInspectingPiece] = useState<InspectingPieceState>(null);

  const loadPieceCatalogUseCase = useMemo(() => createLoadPieceCatalogUseCase(), []);
  const claimStageClearRewardUseCase = useMemo(() => createClaimStageClearRewardUseCase(), []);
  const createGameUseCase = useMemo(() => new CreateGameUseCase(), []);
  const commitGameMoveUseCase = useMemo(() => new CommitGameMoveUseCase(), []);
  const loadGameStateUseCase = useMemo(() => new LoadGameStateUseCase(), []);
  const loadGameLegalMovesUseCase = useMemo(() => new LoadGameLegalMovesUseCase(), []);
  const requestAiMoveUseCase = useMemo(() => new RequestAiMoveUseCase(), []);

  const isMountedRef = useRef(true);
  const piecesRef = useRef<BoardPiece[]>([]);
  const persistentHazardsRef = useRef<BoardPiece[]>([]);
  const latestMovementRuleByCellRef = useRef<Map<string, string>>(new Map());
  const latestImmobilizedByCellRef = useRef<Set<string>>(new Set());
  const piecesBeforePromotionDialogRef = useRef<BoardPiece[] | null>(null);
  const handsRef = useRef<HandsState>(createEmptyHandsState());
  const stateHashRef = useRef<string | null>(null);
  const handleCellPressRef = useRef<(row: number, col: number) => void>(() => undefined);
  const hasEnteredBattleRef = useRef(false);
  const prevStageRef = useRef<string | undefined>(undefined);
  const aiThinkingRef = useRef(false);
  const inFlightAiKeyRef = useRef<string | null>(null);
  const lastSuccessfulAiKeyRef = useRef<string | null>(null);
  const clearRewardClaimedRef = useRef(false);
  const battleSessionSettledRef = useRef(false);
  const skillToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRecoveringFromIllegalMoveRef = useRef(false);
  const pendingAiResumeRef = useRef<{ moveNo: number; side: Side } | null>(null);
  const illegalRecoverSignatureRef = useRef<string | null>(null);
  const illegalRecoverAttemptsRef = useRef(0);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (skillToastTimeoutRef.current) {
        clearTimeout(skillToastTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    piecesRef.current = pieces;
  }, [pieces]);

  useEffect(() => {
    handsRef.current = hands;
  }, [hands]);

  useEffect(() => {
    stateHashRef.current = stateHash;
  }, [stateHash]);

  useEffect(() => {
    if (!promotionImageFlash) return;
    const hit = pieces.find(
      (p) =>
        p.row === promotionImageFlash.row &&
        p.col === promotionImageFlash.col &&
        p.side === promotionImageFlash.side,
    );
    if (hit != null && getPieceImageSource(hit) != null) {
      setPromotionImageFlash(null);
      return;
    }
    const t = setTimeout(() => setPromotionImageFlash(null), 2500);
    return () => clearTimeout(t);
  }, [pieces, promotionImageFlash]);

  const pieceDefsByChar = useMemo(
    () =>
      Object.fromEntries(pieceCatalog.map((item) => [item.char, item])) as Record<
        string,
        PieceCatalogItem
      >,
    [pieceCatalog],
  );

  const pieceDefsByCode = useMemo(() => {
    const map: Record<string, PieceCatalogItem> = {};
    for (const it of pieceCatalog) {
      if (it.pieceCode) {
        map[it.pieceCode.toUpperCase()] = it;
      }
      if (it.canonicalCode) {
        map[it.canonicalCode.toUpperCase()] = it;
        map[it.canonicalCode.toLowerCase()] = it;
      }
      const codeFromChar = CHAR_TO_CODE[it.char];
      if (codeFromChar) {
        map[codeFromChar.toUpperCase()] = it;
      }
    }
    for (const [code, char] of Object.entries(CODE_TO_CHAR)) {
      const item = pieceDefsByChar[char];
      if (item) {
        map[code] = item;
      }
    }
    return map;
  }, [pieceCatalog, pieceDefsByChar]);

  const promotedPieceDefsByCode = useMemo(() => {
    const map: Record<string, PieceCatalogItem> = {};
    for (const item of pieceCatalog) {
      if (!item.isPromoted) continue;
      const byPieceCode = item.pieceCode?.toUpperCase();
      if (byPieceCode) {
        map[byPieceCode] = item;
        continue;
      }
      const byChar = CHAR_TO_CODE[item.char]?.toUpperCase();
      if (byChar) {
        map[byChar] = item;
      }
    }
    for (const [code, char] of Object.entries(PROMOTED_CODE_TO_CHAR)) {
      if (map[code]) continue;
      const fallback = pieceDefsByChar[char];
      if (fallback) {
        map[code] = fallback;
      }
    }
    return map;
  }, [pieceCatalog, pieceDefsByChar]);

  const pieceSfenMapping = useMemo(() => createPieceSfenMapping(pieceCatalog), [pieceCatalog]);

  function resolveSkillName(move: BattleMove): string | null {
    const code = move.pieceCode || move.dropPieceCode;
    if (!code) return null;
    const base = normalizeSkillName(pieceDefsByCode[code]?.skill);
    const promoted = normalizeSkillName(promotedPieceDefsByCode[code]?.skill);
    return move.promote ? (promoted ?? base) : (base ?? promoted);
  }

  function showSkillActivation(actor: Side, move: BattleMove) {
    const actorLabel = actor === 'player' ? 'あなた' : 'CPU';
    const skillName = resolveSkillName(move);
    const message = skillName
      ? `${actorLabel} スキル発動: ${skillName}`
      : `${actorLabel} スキル発動`;
    setSkillActivationText(message);
    if (skillToastTimeoutRef.current) {
      clearTimeout(skillToastTimeoutRef.current);
    }
    skillToastTimeoutRef.current = setTimeout(() => {
      setSkillActivationText(null);
      skillToastTimeoutRef.current = null;
    }, 1400);
  }

  function syncFromCanonicalPosition(
    position: BattleCanonicalPosition,
    game: BattleGameStatus,
    preservedMovedPiece?: PreservedMovedPiece,
    optimisticBaseline?: BoardPiece[] | null,
  ): Side | null {
    const synced = syncCanonicalState({
      position,
      existingPieces: piecesRef.current,
      persistentHazards: persistentHazardsRef.current,
      pieceCatalog,
      pieceSfenMapping,
      pieceDefsByCode,
      promotedPieceDefsByCode,
      preservedMovedPiece,
      optimisticBaseline,
    });
    setPromotionImageFlash(null);
    setPieces(synced.pieces);
    persistentHazardsRef.current = synced.persistentHazards;
    setPoisonHazardCells(synced.poisonHazardCells);
    setHands(synced.hands);
    setSideToMove(synced.sideToMove);
    setMoveNo(synced.moveNo);
    setSelectedCell(null);
    setSelectedDropPieceCode(null);
    setLegalTargets([]);
    setEnemyPreviewTargets([]);
    setAiPreviewTarget(null);
    setPlayerLegalMoves([]);
    setPendingPromotion(null);
    latestMovementRuleByCellRef.current = synced.movementRuleByCell;
    latestImmobilizedByCellRef.current = synced.immobilizedKeys;
    stateHashRef.current = synced.stateHash;
    setStateHash(synced.stateHash);

    if (game.status === 'finished') {
      const nextWinner = game.winnerSide ?? null;
      setWinner(nextWinner);
      return nextWinner;
    }

    setWinner(null);
    return null;
  }

  const isFinished = winner !== null;

  useEffect(() => {
    const next: BoardPiece[] = [];
    const snapshotLooksZeroBased = snapshot.placements.some(
      (placement) => placement.row === 0 || placement.col === 0,
    );
    const snapshotLooksOneBased =
      !snapshotLooksZeroBased &&
      snapshot.placements.length > 0 &&
      snapshot.placements.every(
        (placement) =>
          Number.isInteger(placement.row) &&
          Number.isInteger(placement.col) &&
          placement.row >= 1 &&
          placement.row <= BOARD_SIZE &&
          placement.col >= 1 &&
          placement.col <= BOARD_SIZE,
      );
    for (const placement of snapshot.placements) {
      const row = snapshotLooksOneBased ? placement.row - 1 : placement.row;
      const col = snapshotLooksOneBased ? placement.col - 1 : placement.col;
      if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) continue;
      next.push({
        side: placement.side === 'enemy' ? 'enemy' : 'player',
        row,
        col,
        pieceCode: pieceCodeFromPlacement(placement.pieceCode, placement.char, pieceDefsByChar),
        char: placement.char,
        promoted: false,
        imageSignedUrl: placement.imageSignedUrl,
      });
    }
    const snapshotPersistentHazards = next.filter((p) => PERSISTENT_SYNC_GUARD_CHARS.has(p.char));
    const stageChanged = prevStageRef.current !== stageParam;
    prevStageRef.current = stageParam;
    if (!stageChanged && gameId) {
      return;
    }

    setPieces(next);
    persistentHazardsRef.current = snapshotPersistentHazards;
    setSideToMove('player');
    setMoveNo(1);
    setGameId(null);
    setAiError(null);
    setSelectedCell(null);
    setSelectedDropPieceCode(null);
    setLegalTargets([]);
    setEnemyPreviewTargets([]);
    setPoisonHazardCells([]);
    setAiPreviewTarget(null);
    setPlayerLegalMoves([]);
    setHands(createEmptyHandsState());
    setPendingPromotion(null);
    setStateHash(null);
    setWinner(null);
    setClearRewardText(null);
    setSkillActivationText(null);
    if (skillToastTimeoutRef.current) {
      clearTimeout(skillToastTimeoutRef.current);
      skillToastTimeoutRef.current = null;
    }
    aiThinkingRef.current = false;
    inFlightAiKeyRef.current = null;
    lastSuccessfulAiKeyRef.current = null;
    clearRewardClaimedRef.current = false;
    battleSessionSettledRef.current = false;
    hasEnteredBattleRef.current = false;
    pendingAiResumeRef.current = null;
    illegalRecoverSignatureRef.current = null;
    illegalRecoverAttemptsRef.current = 0;
  }, [gameId, pieceDefsByChar, snapshot, stageParam]);

  useEffect(() => {
    let active = true;
    loadPieceCatalogUseCase
      .execute()
      .then((items) => {
        if (active) {
          setPieceCatalog(items);
          setLocalBattlePieceCatalog(items);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setAiError(toUserFacingBattleError(error));
        }
      });
    return () => {
      active = false;
    };
  }, [loadPieceCatalogUseCase]);

  useEffect(() => {
    if (!loadError) return;
    setAiError(toUserFacingBattleError(loadError));
    setGameId(null);
    setWinner(null);
    setIsCreatingGame(false);
    setIsAiThinking(false);
    setPlayerLegalMoves([]);
  }, [loadError]);

  useEffect(() => {
    if (isLoading || loadError || isCreatingGame || gameId || !userId) return;
    if (Object.keys(pieceSfenMapping.codeToSfen).length === 0) return;
    if (snapshot.placements.length > 0 && pieces.length === 0) return;

    setIsCreatingGame(true);
    const stageNo = Number(stageParam);
    void createGameUseCase
      .execute({
        playerId: userId,
        stageNo: Number.isInteger(stageNo) && stageNo > 0 ? stageNo : undefined,
        initialPosition: {
          sideToMove,
          turnNumber: moveNo,
          moveCount: moveNo - 1,
          sfen: buildSfen(pieces, hands, sideToMove, moveNo, pieceSfenMapping, pieceDefsByChar),
          boardState: buildBoardState(pieces, pieceDefsByCode),
          hands,
        },
      })
      .then((res) => {
        if (isMountedRef.current) {
          setGameId(res.gameId);
        }
      })
      .catch((error: unknown) => {
        if (isMountedRef.current) {
          setAiError(toUserFacingBattleError(error));
        }
      })
      .finally(() => {
        if (isMountedRef.current) {
          setIsCreatingGame(false);
        }
      });
  }, [
    createGameUseCase,
    gameId,
    hands,
    isCreatingGame,
    isLoading,
    loadError,
    moveNo,
    pieceDefsByChar,
    pieceDefsByCode,
    pieceSfenMapping,
    pieces,
    sideToMove,
    snapshot,
    stageParam,
    userId,
  ]);

  useEffect(() => {
    if (!gameId || sideToMove !== 'player' || isCreatingGame || isFinished) {
      return;
    }

    let active = true;
    setAiError(null);
    setIsLoadingPlayerLegalMoves(true);

    loadGameLegalMovesUseCase
      .execute({ gameId })
      .then((result) => {
        if (!active) return;
        if (result.sideToMove !== 'player' || result.moveNo !== moveNo) {
          setPlayerLegalMoves((prev) => (prev.length === 0 ? prev : []));
          return;
        }
        setStateHash(result.stateHash);
        if (result.legalMoves.length === 0) {
          setWinner('enemy');
          return;
        }
        setPlayerLegalMoves(result.legalMoves);
      })
      .catch((error: unknown) => {
        if (active) {
          setAiError(toUserFacingBattleError(error));
          setPlayerLegalMoves((prev) => (prev.length === 0 ? prev : []));
        }
      })
      .finally(() => {
        if (active) {
          setIsLoadingPlayerLegalMoves(false);
        }
      });

    return () => {
      active = false;
    };
  }, [gameId, isCreatingGame, isFinished, loadGameLegalMovesUseCase, moveNo, sideToMove]);

  useEffect(() => {
    if (Object.keys(failedImageKeys).length === 0) {
      return;
    }
    setFailedImageKeys({});
  }, [failedImageKeys, pieces]);

  useEffect(() => {
    if (!selectedCell) return;
    const at = findPieceAt(pieces, selectedCell.row, selectedCell.col);
    if (at?.darkVeiled) {
      setLegalTargets([]);
      setEnemyPreviewTargets([]);
    }
  }, [pieces, selectedCell]);

  async function claimStageClearRewardIfNeeded() {
    if (clearRewardClaimedRef.current) return;
    clearRewardClaimedRef.current = true;
    battleSessionSettledRef.current = true;
    try {
      const result = await claimStageClearRewardUseCase.execute({ stageId: stageParam });
      if (!result) return;

      const pieceCount = result.granted.pieces.reduce((sum, piece) => sum + piece.quantity, 0);
      const pieceSummary = pieceCount > 0 ? ` / 駒+${pieceCount}` : '';
      setClearRewardText(
        `${result.firstClear ? '初回' : '周回'}報酬: 歩+${result.granted.pawn} 金+${result.granted.gold}${pieceSummary}`,
      );
    } catch (error: unknown) {
      battleSessionSettledRef.current = false;
      setAiError(toUserFacingBattleError(error));
    }
  }

  function applyOptimisticMove(actorSide: Side, move: BattleMove) {
    setPieces((prev) =>
      enforcePersistentHazardCells(
        computePiecesAfterOptimisticMove(
          prev,
          actorSide,
          move,
          pieceDefsByCode,
          pieceDefsByChar,
          promotedPieceDefsByCode,
        ),
        persistentHazardsRef.current,
      ),
    );
    if (move.dropPieceCode) {
      setHands((prev) => addHandPiece(prev, actorSide, move.dropPieceCode!, -1));
    }
  }

  async function waitForNextFrame() {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  }

  async function waitForAiMoveVisualCommit() {
    await waitForNextFrame();
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 120);
    });
  }

  async function handleAiMove(nextMoveNo: number, expectedSideToMove: Side = sideToMove) {
    if (
      !gameId ||
      expectedSideToMove !== 'enemy' ||
      isAiThinking ||
      isCreatingGame ||
      aiThinkingRef.current
    ) {
      return;
    }
    const requestKey = `${gameId}:${nextMoveNo}:${expectedSideToMove}`;
    if (inFlightAiKeyRef.current === requestKey) return;
    if (lastSuccessfulAiKeyRef.current === requestKey) return;
    aiThinkingRef.current = true;
    inFlightAiKeyRef.current = requestKey;
    setIsAiThinking(true);
    setAiError(null);

    try {
      const response = await requestAiMoveUseCase.execute({
        gameId,
        moveNo: nextMoveNo,
        stateHash: stateHashRef.current,
        engineConfig: {},
      });

      if (response.skillTriggered && response.selectedMove) {
        showSkillActivation('enemy', response.selectedMove);
      }
      const patchedAiPosition = patchHandsForStarReturnSkill(
        response.position,
        'enemy',
        response.selectedMove,
        response.skillTriggered,
        handsRef.current,
      );

      let preservedMovedPiece: PreservedMovedPiece | undefined;
      let optimisticBaseline: BoardPiece[] | undefined;
      const selectedMove = response.selectedMove;
      const invalidSelfCaptureResolved =
        selectedMove &&
        isSelfCaptureLikeMove(
          piecesRef.current,
          selectedMove,
          'enemy',
          persistentHazardsRef.current,
        )
          ? resolveBattleMovePlacements(piecesRef.current, selectedMove)
          : null;
      if (invalidSelfCaptureResolved) {
        setAiError('CPU の着手候補が不正なため、盤面同期のみ行いました。');
      }
      const selectedMoveForApply = invalidSelfCaptureResolved ? null : selectedMove;
      if (selectedMoveForApply?.fromRow != null && selectedMoveForApply?.fromCol != null) {
        const moved = findPieceAt(
          piecesRef.current,
          selectedMoveForApply.fromRow,
          selectedMoveForApply.fromCol,
        );
        if (moved && moved.side === 'enemy') {
          const resolvedPieceCode = pieceCodeFromPlacement(
            moved.pieceCode ?? null,
            moved.char,
            pieceDefsByChar,
          );
          const codeKey = (resolvedPieceCode ?? moved.pieceCode ?? '').toUpperCase();
          const promoted = selectedMoveForApply.promote ? true : (moved.promoted ?? false);
          const promotedDef = selectedMoveForApply.promote
            ? promotedPieceDefsByCode[codeKey]
            : null;
          const imageSignedUrl = promotedDef?.imageSignedUrl ?? moved.imageSignedUrl;
          const char = resolvedPieceCode
            ? pieceCharFromCode(resolvedPieceCode, moved.side, promoted)
            : moved.char;
          preservedMovedPiece = {
            side: moved.side,
            toRow: selectedMoveForApply.toRow,
            toCol: selectedMoveForApply.toCol,
            pieceCode: resolvedPieceCode ?? moved.pieceCode ?? null,
            char,
            imageSignedUrl,
            promoted,
          };
        }
      }

      if (selectedMoveForApply) {
        optimisticBaseline = computePiecesAfterOptimisticMove(
          piecesRef.current,
          'enemy',
          selectedMoveForApply,
          pieceDefsByCode,
          pieceDefsByChar,
          promotedPieceDefsByCode,
        );
        setAiPreviewTarget({ row: selectedMoveForApply.toRow, col: selectedMoveForApply.toCol });
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 1000);
        });
        setAiPreviewTarget(null);
        applyOptimisticMove('enemy', selectedMoveForApply);
        await waitForAiMoveVisualCommit();
      }

      const nextWinner = syncFromCanonicalPosition(
        patchedAiPosition,
        response.game,
        preservedMovedPiece,
        optimisticBaseline,
      );
      lastSuccessfulAiKeyRef.current = requestKey;
      if (nextWinner === 'player') {
        void claimStageClearRewardIfNeeded();
      }
    } catch (error: unknown) {
      if (isGameAlreadyFinishedError(error)) {
        setWinner('player');
        setAiError(null);
        void claimStageClearRewardIfNeeded();
      } else {
        if (isIllegalMoveError(error)) {
          pendingAiResumeRef.current = null;
          setAiError('CPU の着手が不正だったため失敗しました。次の候補選択で継続します。');
          return;
        }
        setAiError(toUserFacingBattleError(error));
      }
    } finally {
      setAiPreviewTarget(null);
      aiThinkingRef.current = false;
      inFlightAiKeyRef.current = null;
      setIsAiThinking(false);
    }
  }

  useEffect(
    () => {
      const pending = pendingAiResumeRef.current;
      if (!pending) return;
      if (!gameId || isAiThinking || isCreatingGame || isFinished) return;
      if (sideToMove !== 'enemy') return;
      pendingAiResumeRef.current = null;
      void handleAiMove(pending.moveNo, pending.side);
    },
    // `handleAiMove` は局面状態を広く閉じ込めるため意図的に通常関数のままにしている。
    // 再開判定は `pendingAiResumeRef` と各種 guard で制御している。
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gameId, isAiThinking, isCreatingGame, isFinished, moveNo, sideToMove],
  );

  useEffect(() => {
    if (winner !== 'enemy') return;
    if (battleSessionSettledRef.current) return;
    battleSessionSettledRef.current = true;
    void claimStageClearRewardUseCase
      .execute({ stageId: stageParam, result: 'failed' })
      .catch(() => {
        if (isMountedRef.current) {
          battleSessionSettledRef.current = false;
        }
      });
  }, [claimStageClearRewardUseCase, stageParam, winner]);

  async function recoverFromIllegalMoveIfNeeded(): Promise<boolean> {
    if (!gameId || isRecoveringFromIllegalMoveRef.current) return false;
    isRecoveringFromIllegalMoveRef.current = true;
    try {
      const latest = await loadGameStateUseCase.execute({ gameId });
      const recoverSignature = `${latest.position.turnNumber}:${latest.position.sideToMove}:${latest.position.stateHash ?? '-'}`;
      if (illegalRecoverSignatureRef.current !== recoverSignature) {
        illegalRecoverSignatureRef.current = recoverSignature;
        illegalRecoverAttemptsRef.current = 1;
      } else {
        illegalRecoverAttemptsRef.current += 1;
      }
      if (illegalRecoverAttemptsRef.current > 3) {
        pendingAiResumeRef.current = null;
        return false;
      }
      setStateHash(latest.position.stateHash ?? null);
      const nextWinner = syncFromCanonicalPosition(latest.position, latest.game);
      if (nextWinner) {
        illegalRecoverSignatureRef.current = null;
        illegalRecoverAttemptsRef.current = 0;
        return true;
      }

      if (latest.position.sideToMove === 'player') {
        try {
          const legal = await loadGameLegalMovesUseCase.execute({ gameId });
          setStateHash(legal.stateHash ?? latest.position.stateHash ?? null);
          setPlayerLegalMoves(legal.legalMoves);
          illegalRecoverSignatureRef.current = null;
          illegalRecoverAttemptsRef.current = 0;
        } catch {
          setPlayerLegalMoves([]);
        }
      } else {
        setPlayerLegalMoves([]);
        pendingAiResumeRef.current = {
          moveNo: latest.position.moveCount + 1,
          side: latest.position.sideToMove,
        };
      }
      setAiError(null);
      return true;
    } catch {
      return false;
    } finally {
      isRecoveringFromIllegalMoveRef.current = false;
    }
  }

  async function sendCommittedPlayerMoveToServer(
    move: BattleMove,
    optimisticBaseline: BoardPiece[],
    preservedMovedPiece: PreservedMovedPiece | undefined,
    rollbackSnapshot?: { pieces: BoardPiece[]; hands: HandsState },
  ) {
    if (!gameId) return;
    try {
      const result = await commitGameMoveUseCase.execute({
        gameId,
        moveNo,
        actorSide: 'player',
        move,
        stateHash: stateHashRef.current,
      });

      if (result.skillTriggered) {
        showSkillActivation('player', result.move);
      }
      const patchedPlayerPosition = patchHandsForStarReturnSkill(
        result.position,
        'player',
        result.move,
        result.skillTriggered,
      );

      const nextWinner = syncFromCanonicalPosition(
        patchedPlayerPosition,
        result.game,
        preservedMovedPiece,
        optimisticBaseline,
      );
      if (nextWinner === 'player') {
        void claimStageClearRewardIfNeeded();
        return;
      }
      if (result.position.sideToMove === 'enemy') {
        void handleAiMove(result.position.moveCount + 1, result.position.sideToMove);
      }
    } catch (error: unknown) {
      if (isIllegalMoveError(error)) {
        const recovered = await recoverFromIllegalMoveIfNeeded();
        if (recovered) {
          setAiError('局面を自動更新しました。対局を続行します。');
          return;
        }
        pendingAiResumeRef.current = null;
        setAiError(
          '同じ局面で自動更新を複数回試しましたが復旧できませんでした。画面を開き直してください。',
        );
        return;
      }
      if (rollbackSnapshot) {
        piecesRef.current = rollbackSnapshot.pieces;
        handsRef.current = rollbackSnapshot.hands;
        setPieces(rollbackSnapshot.pieces);
        setHands(rollbackSnapshot.hands);
      }
      setAiError(toUserFacingBattleError(error));
    }
  }

  async function commitPlayerMove(move: BattleMove) {
    const rollbackSnapshot = {
      pieces: piecesRenderRef.current,
      hands: handsRef.current,
    };

    if (!gameId || isAiThinking || isCreatingGame) return;

    const preservedMovedPiece = buildPreservedMovedPieceForPlayer(
      pieces,
      move,
      pieceDefsByChar,
      promotedPieceDefsByCode,
    );
    const optimisticBaseline = computePiecesAfterOptimisticMove(
      pieces,
      'player',
      move,
      pieceDefsByCode,
      pieceDefsByChar,
      promotedPieceDefsByCode,
    );

    const applyBoardAndClearSelection = () => {
      piecesRef.current = optimisticBaseline;
      setPieces(optimisticBaseline);
      if (move.dropPieceCode) {
        setHands((prev) => addHandPiece(prev, 'player', move.dropPieceCode!, -1));
      }
      setSelectedCell(null);
      setSelectedDropPieceCode(null);
      setLegalTargets([]);
      setEnemyPreviewTargets([]);
      setPlayerLegalMoves([]);
      setPendingPromotion(null);
      setAiError(null);
    };

    try {
      flushSync(applyBoardAndClearSelection);
    } catch {
      applyBoardAndClearSelection();
    }

    await sendCommittedPlayerMoveToServer(
      move,
      optimisticBaseline,
      preservedMovedPiece,
      rollbackSnapshot,
    );
    setTimeActionMode(null);
  }

  async function commitTimeSkillOnly(cell: BoardCell, piece: BoardPiece) {
    if (!gameId || isAiThinking || isCreatingGame || isFinished) return;
    const rollbackSnapshot = {
      pieces: piecesRenderRef.current,
      hands: handsRef.current,
    };
    const move: BattleMove = {
      fromRow: cell.row,
      fromCol: cell.col,
      toRow: cell.row,
      toCol: cell.col,
      pieceCode: (piece.pieceCode ?? 'TIME').toUpperCase(),
      promote: false,
      dropPieceCode: null,
      capturedPieceCode: null,
      notation: 'time_skill_only',
    };
    setPendingTimeActionCell(null);
    setTimeActionMode(null);
    setSelectedCell(null);
    setSelectedDropPieceCode(null);
    setLegalTargets([]);
    setEnemyPreviewTargets([]);
    setPlayerLegalMoves([]);
    setPendingPromotion(null);
    setAiError(null);
    await sendCommittedPlayerMoveToServer(
      move,
      piecesRenderRef.current,
      undefined,
      rollbackSnapshot,
    );
  }

  function commitPromotionChoice(move: BattleMove, pending: PendingPromotion) {
    if (!gameId || isAiThinking || isCreatingGame) return;
    const preBoard = piecesRenderRef.current;
    const trusted: TrustedBoardEndpoints = {
      fromRow: pending.boardFromRow,
      fromCol: pending.boardFromCol,
      toRow: pending.boardToRow,
      toCol: pending.boardToCol,
    };

    if (move.promote) {
      const atDest = findPieceAt(preBoard, pending.boardToRow, pending.boardToCol);
      if (atDest && atDest.side === 'player') {
        const mod = localPromotedModuleFromBaseCodeCandidates(
          collectStandardBaseCodesForLocalPromotedImage(atDest),
        );
        if (mod != null) {
          setPromotionImageFlash({
            row: pending.boardToRow,
            col: pending.boardToCol,
            side: 'player',
            assetModule: mod,
            flashKey: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          });
        } else {
          setPromotionImageFlash(null);
        }
      } else {
        setPromotionImageFlash(null);
      }
    } else {
      setPromotionImageFlash(null);
    }

    const snapshotBeforeDialog = piecesBeforePromotionDialogRef.current;
    piecesBeforePromotionDialogRef.current = null;

    let optimisticBaseline: BoardPiece[];
    let preservedMovedPiece: PreservedMovedPiece | undefined;
    if (move.promote) {
      const baseForPromote =
        snapshotBeforeDialog && snapshotBeforeDialog.length > 0 ? snapshotBeforeDialog : preBoard;
      optimisticBaseline = computePiecesAfterOptimisticMove(
        baseForPromote,
        'player',
        move,
        pieceDefsByCode,
        pieceDefsByChar,
        promotedPieceDefsByCode,
        trusted,
      );
      preservedMovedPiece = buildPreservedMovedPieceForPlayer(
        snapshotBeforeDialog && snapshotBeforeDialog.length > 0
          ? snapshotBeforeDialog
          : baseForPromote,
        move,
        pieceDefsByChar,
        promotedPieceDefsByCode,
        trusted,
      );
    } else {
      optimisticBaseline = preBoard;
      preservedMovedPiece = buildPreservedMovedPieceForPlayer(
        preBoard,
        move,
        pieceDefsByChar,
        promotedPieceDefsByCode,
        trusted,
      );
    }

    piecesRef.current = optimisticBaseline;
    setPieces(optimisticBaseline);
    if (move.promote) {
      setBoardSpriteEpoch((e) => e + 1);
    }
    setSelectedCell(null);
    setSelectedDropPieceCode(null);
    setLegalTargets([]);
    setEnemyPreviewTargets([]);
    setPlayerLegalMoves([]);
    setPendingPromotion(null);
    setAiError(null);

    const rollbackSnapshot = {
      pieces:
        snapshotBeforeDialog && snapshotBeforeDialog.length > 0 ? snapshotBeforeDialog : preBoard,
      hands: handsRef.current,
    };

    void sendCommittedPlayerMoveToServer(
      move,
      optimisticBaseline,
      preservedMovedPiece,
      rollbackSnapshot,
    );
  }

  function handleCellPress(row: number, col: number) {
    if (sideToMove !== 'player' || isAiThinking || isCreatingGame || isFinished) return;
    if (pendingPromotion) return;

    const tapped = { row, col };
    if (selectedDropPieceCode) {
      const dropMoves = legalMovesToTarget(
        legalMovesForDropPiece(playerLegalMoves, selectedDropPieceCode, pieceCatalog),
        tapped,
      );
      if (dropMoves.length > 0) {
        void commitPlayerMove(dropMoves[0]);
        return;
      }
      const tappedPiece = findPieceAt(pieces, row, col);
      if (!tappedPiece || tappedPiece.side !== 'player') {
        return;
      }
      setSelectedDropPieceCode(null);
      setLegalTargets([]);
      setTimeActionMode(null);
    }

    if (selectedCell) {
      const targetMoves = legalMovesToTarget(
        legalMovesForBoardPiece(playerLegalMoves, selectedCell.row, selectedCell.col),
        tapped,
      );
      if (targetMoves.length > 0) {
        const selectedPiece = findPieceAt(pieces, selectedCell.row, selectedCell.col);
        const isTimeSelected =
          selectedPiece?.side === 'player' &&
          ((selectedPiece.pieceCode?.toUpperCase() ?? '') === 'TIME' ||
            selectedPiece.char === '時');
        const moveWithTimeAction = (m: BattleMove): BattleMove => {
          if (!isTimeSelected || !timeActionMode) return m;
          if (timeActionMode === 'normal') return { ...m, notation: null };
          return { ...m, notation: 'time_skill' };
        };
        const promoteMove = targetMoves.find((move) => move.promote);
        const nonPromoteMove = targetMoves.find((move) => !move.promote);
        if (promoteMove && nonPromoteMove) {
          setPromotionImageFlash(null);
          piecesBeforePromotionDialogRef.current = pieces.map((p) => ({ ...p }));
          const afterNonPromote = computePiecesAfterOptimisticMove(
            pieces,
            'player',
            nonPromoteMove,
            pieceDefsByCode,
            pieceDefsByChar,
            promotedPieceDefsByCode,
          );
          piecesRef.current = afterNonPromote;
          setPieces(afterNonPromote);
          setBoardSpriteEpoch((e) => e + 1);
          setSelectedCell(null);
          setLegalTargets([]);
          setEnemyPreviewTargets([]);
          setPendingPromotion({
            promoteMove: moveWithTimeAction(promoteMove),
            nonPromoteMove: moveWithTimeAction(nonPromoteMove),
            boardFromRow: selectedCell.row,
            boardFromCol: selectedCell.col,
            boardToRow: tapped.row,
            boardToCol: tapped.col,
          });
          return;
        }
        void commitPlayerMove(moveWithTimeAction(promoteMove ?? nonPromoteMove ?? targetMoves[0]));
        return;
      }
    }

    const piece = findPieceAt(pieces, row, col);
    if (piece?.side === 'enemy') {
      const enemyPieceDef =
        piece.promoted && piece.pieceCode
          ? (promotedPieceDefsByCode[piece.pieceCode] ?? pieceDefsByCode[piece.pieceCode])
          : ((piece.pieceCode ? pieceDefsByCode[piece.pieceCode] : null) ??
            pieceDefsByChar[piece.char] ??
            null);

      const rawTargets = enemyPieceDef?.moveVectors?.length
        ? getLegalTargetsFromVectors(pieces, piece, enemyPieceDef.moveVectors, BOARD_SIZE, {
            canJump: enemyPieceDef.canJump === true,
          })
        : [];
      const movementRule =
        latestMovementRuleByCellRef.current.get(`${piece.side}:${piece.row}:${piece.col}`) ?? null;
      const pieceKey = `${piece.side}:${piece.row}:${piece.col}`;
      const immobilizedBySkill = latestImmobilizedByCellRef.current.has(pieceKey);
      const targets = applyMovementRuleToTargets(
        { row: piece.row, col: piece.col },
        rawTargets,
        movementRule,
      );
      const previewTargets = immobilizedBySkill ? [{ row: piece.row, col: piece.col }] : targets;

      setSelectedCell(null);
      setSelectedDropPieceCode(null);
      setLegalTargets([]);
      setEnemyPreviewTargets(previewTargets);
      return;
    }

    if (!piece || piece.side !== 'player') {
      setSelectedCell(null);
      setLegalTargets([]);
      setEnemyPreviewTargets([]);
      setPendingTimeActionCell(null);
      setTimeActionMode(null);
      return;
    }

    const isTimePiece = (piece.pieceCode?.toUpperCase() ?? '') === 'TIME' || piece.char === '時';
    if (isTimePiece && !selectedCell) {
      if (hasAdjacentEnemyPiece(pieces, row, col)) {
        setPendingTimeActionCell({ row, col });
        return;
      }
      setTimeActionMode('normal');
    }

    const targets = uniqueTargetsFromMoves(legalMovesForBoardPiece(playerLegalMoves, row, col));
    const pieceKey = `${piece.side}:${piece.row}:${piece.col}`;
    const movementRule = latestMovementRuleByCellRef.current.get(pieceKey) ?? null;
    const immobilizedBySkill = latestImmobilizedByCellRef.current.has(pieceKey);
    const affectedBySkill = movementRule != null || immobilizedBySkill || Boolean(piece.darkVeiled);
    if (targets.length === 0) {
      if (affectedBySkill) {
        setSelectedDropPieceCode(null);
        setSelectedCell({ row, col });
        setLegalTargets([]);
        setEnemyPreviewTargets([{ row, col }]);
        setPendingTimeActionCell(null);
        setTimeActionMode(null);
        return;
      }
      setSelectedCell(null);
      setLegalTargets([]);
      setEnemyPreviewTargets([]);
      setPendingTimeActionCell(null);
      setTimeActionMode(null);
      return;
    }

    setSelectedDropPieceCode(null);
    setSelectedCell({ row, col });
    if (affectedBySkill) {
      setLegalTargets([]);
      setEnemyPreviewTargets(targets);
    } else {
      setLegalTargets(piece.darkVeiled ? [] : targets);
      setEnemyPreviewTargets([]);
    }
    setPendingTimeActionCell(null);
  }

  function confirmTimeAction(mode: TimeActionMode) {
    const cell = pendingTimeActionCell;
    if (!cell) return;
    const piece = findPieceAt(pieces, cell.row, cell.col);
    if (!piece || piece.side !== 'player') {
      setPendingTimeActionCell(null);
      setTimeActionMode(null);
      return;
    }
    const targets = uniqueTargetsFromMoves(
      legalMovesForBoardPiece(playerLegalMoves, cell.row, cell.col),
    );
    if (targets.length === 0) {
      setPendingTimeActionCell(null);
      setTimeActionMode(null);
      return;
    }
    if (mode === 'skill') {
      void commitTimeSkillOnly(cell, piece);
      return;
    }
    setTimeActionMode(mode);
    setSelectedDropPieceCode(null);
    setSelectedCell(cell);
    setLegalTargets(piece.darkVeiled ? [] : targets);
    setEnemyPreviewTargets([]);
    setPendingTimeActionCell(null);
  }

  function handleCellLongPress(row: number, col: number) {
    const target = findPieceAt(pieces, row, col);
    if (!target) return;

    const lookupChar =
      target.promoted && target.pieceCode
        ? (PROMOTED_CODE_TO_CHAR[target.pieceCode] ?? target.char)
        : target.char;
    const detail =
      pieceDefsByChar[lookupChar] ??
      (target.pieceCode ? pieceDefsByCode[target.pieceCode] : undefined) ??
      null;

    setInspectingPiece({
      char: lookupChar,
      pieceCode: target.pieceCode,
      name: detail?.name ?? lookupChar,
      desc: resolveInspectSkillDescription(lookupChar, detail?.desc),
      move: resolveInspectMoveDescription(lookupChar, detail?.move),
      imageSignedUrl: detail?.imageSignedUrl ?? target.imageSignedUrl ?? null,
    });
  }

  function handleHandPiecePress(pieceCode: string) {
    if (sideToMove !== 'player' || isAiThinking || isCreatingGame || isFinished) return;
    if (pendingPromotion) return;
    if (getHandCount(hands, 'player', pieceCode) <= 0) return;

    const targets = uniqueTargetsFromMoves(
      legalMovesForDropPiece(playerLegalMoves, pieceCode, pieceCatalog),
    );
    setSelectedCell(null);
    setSelectedDropPieceCode(pieceCode);
    setLegalTargets(targets);
    setEnemyPreviewTargets([]);
  }

  handleCellPressRef.current = handleCellPress;

  const handleBoardCellPress = (row: number, col: number) => {
    handleCellPressRef.current(row, col);
  };

  const handlePieceImageError = (placementKey: string) => {
    setFailedImageKeys((prev) => (prev[placementKey] ? prev : { ...prev, [placementKey]: true }));
  };

  const shouldBootstrapBattle =
    !isLoading &&
    !loadError &&
    !!userId &&
    Object.keys(pieceSfenMapping.codeToSfen).length > 0 &&
    (snapshot.placements.length === 0 || pieces.length > 0) &&
    !gameId &&
    aiError === null &&
    !isFinished;

  const isWaitingForGameId =
    !isLoading && !loadError && !gameId && isCreatingGame && aiError === null;

  const isBootstrappingBattle =
    shouldBootstrapBattle ||
    isWaitingForGameId ||
    (!hasEnteredBattleRef.current &&
      gameId !== null &&
      sideToMove === 'player' &&
      playerLegalMoves.length === 0 &&
      isLoadingPlayerLegalMoves);

  if (
    !hasEnteredBattleRef.current &&
    gameId !== null &&
    !isCreatingGame &&
    sideToMove === 'player' &&
    playerLegalMoves.length > 0
  ) {
    hasEnteredBattleRef.current = true;
  }

  return {
    snapshot,
    isLoading,
    aiError,
    isFinished,
    isBootstrappingBattle,
    failedImageKeys,
    pieces,
    boardSpriteEpoch,
    sideToMove,
    moveNo,
    isCreatingGame,
    isAiThinking,
    selectedCell,
    selectedDropPieceCode,
    legalTargets,
    aiPreviewTarget,
    enemyPreviewTargets,
    poisonHazardCells,
    hands,
    pendingPromotion,
    pendingTimeActionCell,
    promotionImageFlash,
    pieceCatalog,
    pieceDefsByCode,
    pieceSfenMapping,
    winner,
    clearRewardText,
    skillActivationText,
    inspectingPiece,
    handleBoardCellPress,
    handleCellLongPress,
    handleHandPiecePress,
    handlePieceImageError,
    confirmTimeAction,
    cancelTimeAction: () => {
      setPendingTimeActionCell(null);
      setTimeActionMode(null);
    },
    commitPendingPromotion: (kind: 'promote' | 'nonPromote') => {
      const pending = pendingPromotion;
      if (!pending) return;
      commitPromotionChoice(
        kind === 'promote' ? pending.promoteMove : pending.nonPromoteMove,
        pending,
      );
    },
    closeInspectingPiece: () => {
      setInspectingPiece(null);
    },
  };
}
