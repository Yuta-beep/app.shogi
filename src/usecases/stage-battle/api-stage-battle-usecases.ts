import { StageRepository } from '@/domain/repositories/stage-repository';
import { ApiStageRepository } from '@/infra/repositories/stage-repository';
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
    return {
      stageLabel: setup.labels.stageLabel,
      turnLabel: setup.labels.turnLabel,
      handLabel: setup.labels.handLabel,
      boardSize: setup.board?.size ?? 9,
      placements: (setup.board?.placements ?? []).map((placement) => ({
        side: placement.side,
        row: placement.row,
        col: placement.col,
        pieceId: placement.piece.id ?? null,
        pieceCode: placement.piece.code ?? null,
        char: placement.piece.char ?? placement.piece.code ?? '?',
        imageBucket: placement.piece.imageBucket ?? null,
        imageKey: placement.piece.imageKey ?? null,
        imageSignedUrl: placement.piece.imageSignedUrl ?? null,
      })),
    };
  }
}
