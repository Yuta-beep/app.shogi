import {
  StageBattleSetup,
  StageRepository,
  StageSelectResult,
  StageSummary,
} from '@/domain/repositories/stage-repository';
import { StageApiDataSource } from '@/infra/datasources/stage-api-datasource';

export class ApiStageRepository implements StageRepository {
  constructor(private readonly dataSource = new StageApiDataSource()) {}

  async listStages(): Promise<StageSummary[]> {
    const response = await this.dataSource.getStageList();
    return response.stages;
  }

  async selectStage(stageNo: number): Promise<StageSelectResult> {
    return this.dataSource.postSelectStage(stageNo);
  }

  async getBattleSetup(stageNo: number): Promise<StageBattleSetup> {
    return this.dataSource.getBattleSetup(stageNo);
  }
}
