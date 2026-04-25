import {
  clearActiveStageSession,
  clearLocalBattleGames,
  getActiveStageSession,
  registerActiveStageSession,
} from '@/ai/local-battle-registry';
import { FinishStageBattleSessionUseCase } from '@/usecases/stage-battle/finish-stage-battle-session-usecase';
import {
  PrepareStageBattleUseCase,
  StageBattleSnapshot,
} from '@/usecases/stage-battle/prepare-stage-battle-usecase';
import { StartStageBattleSessionUseCase } from '@/usecases/stage-battle/start-stage-battle-session-usecase';
import {
  ClaimStageClearRewardUseCase,
  StageClearRewardResult,
} from '@/usecases/stage-battle/claim-stage-clear-reward-usecase';

export class LocalPrepareStageBattleUseCase implements PrepareStageBattleUseCase {
  constructor(
    private readonly startUseCase: StartStageBattleSessionUseCase = new StartStageBattleSessionUseCase(),
  ) {}

  async execute(input: { stageId?: string }): Promise<StageBattleSnapshot> {
    if (!input.stageId) {
      return {
        stageLabel: 'STAGE',
        turnLabel: 'TURN 1',
        handLabel: '持ち駒',
        boardSize: 9,
        placements: [],
      };
    }

    const stageNo = Number(input.stageId);
    if (!Number.isInteger(stageNo) || stageNo <= 0) {
      return {
        stageLabel: 'STAGE',
        turnLabel: 'TURN 1',
        handLabel: '持ち駒',
        boardSize: 9,
        placements: [],
      };
    }

    clearLocalBattleGames();
    clearActiveStageSession();
    const session = await this.startUseCase.execute({ stageNo });
    registerActiveStageSession(session);

    return {
      stageLabel: session.stage.stageName || session.labels.stageLabel,
      turnLabel: session.labels.turnLabel,
      handLabel: session.labels.handLabel,
      boardSize: session.board.size,
      placements: session.board.placements.map((raw) => {
        const placement = raw as {
          side: string;
          row: number;
          col: number;
          piece: {
            id: number | null;
            code: string | null;
            char: string | null;
            imageBucket: string | null;
            imageKey: string | null;
            imageSignedUrl?: string | null;
          };
        };
        return {
          side: placement.side,
          row: placement.row,
          col: placement.col,
          pieceId: placement.piece.id ?? null,
          pieceCode: placement.piece.code ?? null,
          char: placement.piece.char ?? placement.piece.code ?? '?',
          imageBucket: placement.piece.imageBucket ?? null,
          imageKey: placement.piece.imageKey ?? null,
          imageSignedUrl: placement.piece.imageSignedUrl ?? null,
        };
      }),
    };
  }
}

export class LocalClaimStageClearRewardUseCase implements ClaimStageClearRewardUseCase {
  constructor(
    private readonly finishUseCase: FinishStageBattleSessionUseCase = new FinishStageBattleSessionUseCase(),
  ) {}

  async execute(input: {
    stageId?: string;
    result?: 'cleared' | 'failed';
  }): Promise<StageClearRewardResult | null> {
    const stageNo = Number(input.stageId);
    if (!Number.isInteger(stageNo) || stageNo <= 0) return null;
    const session = getActiveStageSession();
    if (!session) return null;

    const finished = await this.finishUseCase.execute({
      battleSessionId: session.battleSessionId,
      result: input.result ?? 'cleared',
    });

    clearActiveStageSession();
    return finished.result === 'cleared'
      ? {
          stageNo: finished.stageNo,
          firstClear: finished.firstClear,
          clearCount: finished.clearCount ?? 0,
          granted: finished.granted,
          wallet: finished.wallet,
        }
      : null;
  }
}
