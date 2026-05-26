import { StageRepository } from '@/domain/repositories/stage-repository';
import { resolveStagePlacementIdentity } from '@/features/stage-shogi/domain/board-piece-identity';
import { ApiStageRepository } from '@/infra/repositories/stage-repository';
import {
  ClaimStageClearRewardUseCase,
  StageClearRewardResult,
} from '@/usecases/stage-battle/claim-stage-clear-reward-usecase';
import {
  PrepareStageBattleUseCase,
  StageBattleSnapshot,
} from '@/usecases/stage-battle/prepare-stage-battle-usecase';

export class ApiPrepareStageBattleUseCase implements PrepareStageBattleUseCase {
  constructor(private readonly repository: StageRepository = new ApiStageRepository()) {}

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

    const setup = await this.repository.getBattleSetup(stageNo);
    const stageName = setup.stage?.stageName?.trim();
    return {
      stageLabel: stageName && stageName.length > 0 ? stageName : setup.labels.stageLabel,
      turnLabel: setup.labels.turnLabel,
      handLabel: setup.labels.handLabel,
      boardSize: setup.board?.size ?? 9,
      placements: (setup.board?.placements ?? []).map((placement) => {
        const identity = resolveStagePlacementIdentity({
          char: placement.piece.char,
          code: placement.piece.code,
        });
        return {
          side: placement.side,
          row: placement.row,
          col: placement.col,
          pieceId: placement.piece.id ?? null,
          pieceCode: identity.pieceCode,
          char: identity.char,
          imageBucket: placement.piece.imageBucket ?? null,
          imageKey: placement.piece.imageKey ?? null,
          imageSignedUrl: placement.piece.imageSignedUrl ?? null,
        };
      }),
    };
  }
}

export class ApiClaimStageClearRewardUseCase implements ClaimStageClearRewardUseCase {
  constructor(private readonly repository: StageRepository = new ApiStageRepository()) {}

  async execute(input: {
    stageId?: string;
    result?: 'cleared' | 'failed';
  }): Promise<StageClearRewardResult | null> {
    if (input.result === 'failed') return null;
    if (!input.stageId) return null;
    const stageNo = Number(input.stageId);
    if (!Number.isInteger(stageNo) || stageNo <= 0) return null;
    return this.repository.clearStage(stageNo);
  }
}
