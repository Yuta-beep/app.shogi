export type StageAiConfig = {
  /**
   * 最高評価からこの点差以内の手だけを候補に残す。
   * 小さいほど最善手寄り、大きいほど手がばらける。
   */
  candidateScoreTolerance: number;
  /**
   * 候補選択の温度。0 に近いほど最善手固定、高いほど低評価手も選ばれやすい。
   */
  temperature: number;
  /** 同一の from/to/drop/promote の繰り返しに対する減点。 */
  repeatMovePenalty: number;
  /** 同じ盤上駒を短い間隔で動かすことへの減点。 */
  samePiecePenalty: number;
  /** 直前にいたマスへ戻る往復手への減点。 */
  returnMovePenalty: number;
  /** 繰り返し判定に使う直近AI手数。 */
  recentMoveWindow: number;
  /** 温度選択に入れる最大候補数。 */
  maxCandidatePool: number;
  /**
   * 探索深さ。現エンジンは1手読みのみ実装済みだが、ステージ設定として先に外出しする。
   */
  searchDepth: number;
};

export const DEFAULT_STAGE_AI_CONFIG: StageAiConfig = {
  candidateScoreTolerance: 30,
  temperature: 18,
  repeatMovePenalty: 90,
  samePiecePenalty: 18,
  returnMovePenalty: 70,
  recentMoveWindow: 4,
  maxCandidatePool: 4,
  searchDepth: 1,
};

export const STAGE_AI_CONFIG_BY_STAGE: Readonly<Record<number, Partial<StageAiConfig>>> = {
  1: {
    candidateScoreTolerance: 90,
    temperature: 45,
    repeatMovePenalty: 120,
    samePiecePenalty: 30,
    returnMovePenalty: 100,
    maxCandidatePool: 6,
  },
  2: {
    candidateScoreTolerance: 75,
    temperature: 38,
    repeatMovePenalty: 115,
    samePiecePenalty: 28,
    returnMovePenalty: 95,
    maxCandidatePool: 6,
  },
  3: {
    candidateScoreTolerance: 60,
    temperature: 32,
    repeatMovePenalty: 110,
    samePiecePenalty: 24,
    returnMovePenalty: 90,
    maxCandidatePool: 5,
  },
  10: {
    candidateScoreTolerance: 35,
    temperature: 20,
    maxCandidatePool: 4,
  },
  20: {
    searchDepth: 1,
    candidateScoreTolerance: 24,
    temperature: 14,
    repeatMovePenalty: 80,
    samePiecePenalty: 12,
    returnMovePenalty: 60,
    maxCandidatePool: 3,
  },
  30: {
    searchDepth: 1,
    candidateScoreTolerance: 16,
    temperature: 8,
    repeatMovePenalty: 60,
    samePiecePenalty: 8,
    returnMovePenalty: 45,
    maxCandidatePool: 2,
  },
  40: {
    searchDepth: 1,
    candidateScoreTolerance: 10,
    temperature: 4,
    repeatMovePenalty: 45,
    samePiecePenalty: 5,
    returnMovePenalty: 30,
    maxCandidatePool: 2,
  },
};

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeStageAiConfig(input: Partial<StageAiConfig> = {}): StageAiConfig {
  const merged = { ...DEFAULT_STAGE_AI_CONFIG, ...input };
  return {
    candidateScoreTolerance: clampNumber(merged.candidateScoreTolerance, 0, 10000),
    temperature: clampNumber(merged.temperature, 0, 10000),
    repeatMovePenalty: clampNumber(merged.repeatMovePenalty, 0, 100000),
    samePiecePenalty: clampNumber(merged.samePiecePenalty, 0, 100000),
    returnMovePenalty: clampNumber(merged.returnMovePenalty, 0, 100000),
    recentMoveWindow: Math.floor(clampNumber(merged.recentMoveWindow, 0, 50)),
    maxCandidatePool: Math.max(1, Math.floor(clampNumber(merged.maxCandidatePool, 1, 200))),
    searchDepth: Math.max(1, Math.floor(clampNumber(merged.searchDepth, 1, 5))),
  };
}

export function resolveStageAiConfig(
  stageNo?: number,
  override: Partial<StageAiConfig> = {},
): StageAiConfig {
  const stageConfig =
    stageNo != null && Number.isInteger(stageNo) ? STAGE_AI_CONFIG_BY_STAGE[stageNo] : undefined;
  return normalizeStageAiConfig({
    ...stageConfig,
    ...override,
  });
}
