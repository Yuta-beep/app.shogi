function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

export type StageBattleSessionStart = {
  battleSessionId: string;
  expiresAt: string;
  stage: {
    stageNo: number;
    stageName: string;
    clearConditionType: string;
    clearConditionParams: Record<string, unknown>;
    stageCategory: string;
  };
  labels: {
    stageLabel: string;
    turnLabel: string;
    handLabel: string;
  };
  board: {
    size: number;
    placements: unknown[];
  };
  enemyRoster: unknown[];
  rewards: unknown[];
};

export type StageBattleSessionFinish = {
  battleSessionId: string;
  status: 'finished';
  result: 'cleared' | 'failed';
  stageNo: number;
  clearApplied: boolean;
  firstClear: boolean;
  clearCount: number | null;
  granted: {
    pawn: number;
    gold: number;
    pieces: {
      pieceId: number;
      char: string;
      name: string;
      quantity: number;
    }[];
  };
  wallet: {
    pawnCurrency: number;
    goldCurrency: number;
  };
};

export function parseStageBattleSessionStart(raw: unknown): StageBattleSessionStart {
  const obj = asRecord(raw);
  if (!obj) throw new Error('stage battle start response is not an object');

  const stage = asRecord(obj.stage);
  const labels = asRecord(obj.labels);
  const board = asRecord(obj.board);
  if (!stage || !labels || !board) {
    throw new Error('stage battle start payload is invalid');
  }

  const battleSessionId = asString(obj.battleSessionId ?? obj.battle_session_id);
  const expiresAt = asString(obj.expiresAt ?? obj.expires_at);
  const stageNo = asNumber(stage.stageNo ?? stage.stage_no);
  const stageName = asString(stage.stageName ?? stage.stage_name);
  const stageLabel = asString(labels.stageLabel ?? labels.stage_label);
  const turnLabel = asString(labels.turnLabel ?? labels.turn_label);
  const handLabel = asString(labels.handLabel ?? labels.hand_label);
  const boardSize = asNumber(board.size);

  if (
    !battleSessionId ||
    !expiresAt ||
    stageNo === null ||
    !stageName ||
    !stageLabel ||
    !turnLabel ||
    !handLabel ||
    boardSize === null
  ) {
    throw new Error('stage battle start payload is invalid');
  }

  return {
    battleSessionId,
    expiresAt,
    stage: {
      stageNo,
      stageName,
      clearConditionType: asString(stage.clearConditionType ?? stage.clear_condition_type) ?? '',
      clearConditionParams: (asRecord(stage.clearConditionParams ?? stage.clear_condition_params) ??
        {}) as Record<string, unknown>,
      stageCategory: asString(stage.stageCategory ?? stage.stage_category) ?? 'normal',
    },
    labels: {
      stageLabel,
      turnLabel,
      handLabel,
    },
    board: {
      size: boardSize,
      placements: Array.isArray(board.placements) ? board.placements : [],
    },
    enemyRoster: Array.isArray(obj.enemyRoster ?? obj.enemy_roster)
      ? ((obj.enemyRoster ?? obj.enemy_roster) as unknown[])
      : [],
    rewards: Array.isArray(obj.rewards) ? (obj.rewards as unknown[]) : [],
  };
}

export function parseStageBattleSessionFinish(raw: unknown): StageBattleSessionFinish {
  const obj = asRecord(raw);
  if (!obj) throw new Error('stage battle finish response is not an object');

  const granted = asRecord(obj.granted);
  const wallet = asRecord(obj.wallet);
  if (!granted || !wallet) {
    throw new Error('stage battle finish payload is invalid');
  }

  const battleSessionId = asString(obj.battleSessionId ?? obj.battle_session_id);
  const status = asString(obj.status);
  const result = asString(obj.result);
  const stageNo = asNumber(obj.stageNo ?? obj.stage_no);
  const clearApplied = asBoolean(obj.clearApplied ?? obj.clear_applied);
  const firstClear = asBoolean(obj.firstClear ?? obj.first_clear);
  const clearCountRaw = obj.clearCount ?? obj.clear_count ?? null;
  const clearCount =
    clearCountRaw == null ? null : typeof clearCountRaw === 'number' ? clearCountRaw : null;

  if (
    !battleSessionId ||
    status !== 'finished' ||
    (result !== 'cleared' && result !== 'failed') ||
    stageNo === null ||
    clearApplied === null ||
    firstClear === null
  ) {
    throw new Error('stage battle finish payload is invalid');
  }

  const rawPieces = Array.isArray(granted.pieces) ? (granted.pieces as unknown[]) : [];

  return {
    battleSessionId,
    status: 'finished',
    result,
    stageNo,
    clearApplied,
    firstClear,
    clearCount,
    granted: {
      pawn: asNumber(granted.pawn) ?? 0,
      gold: asNumber(granted.gold) ?? 0,
      pieces: rawPieces
        .map((piece) => {
          const target = asRecord(piece);
          if (!target) return null;
          const pieceId = asNumber(target.pieceId ?? target.piece_id);
          const char = asString(target.char);
          const name = asString(target.name);
          const quantity = asNumber(target.quantity);
          if (pieceId === null || !char || !name || quantity === null) return null;
          return { pieceId, char, name, quantity };
        })
        .filter((piece): piece is NonNullable<typeof piece> => piece !== null),
    },
    wallet: {
      pawnCurrency: asNumber(wallet.pawnCurrency ?? wallet.pawn_currency) ?? 0,
      goldCurrency: asNumber(wallet.goldCurrency ?? wallet.gold_currency) ?? 0,
    },
  };
}
