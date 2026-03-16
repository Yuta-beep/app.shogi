export type BattleMove = {
  fromRow: number | null;
  fromCol: number | null;
  toRow: number;
  toCol: number;
  pieceCode: string;
  promote: boolean;
  dropPieceCode: string | null;
  capturedPieceCode: string | null;
  notation: string | null;
};

export type BattleCanonicalPosition = {
  sideToMove: 'player' | 'enemy';
  turnNumber: number;
  moveCount: number;
  sfen: string;
  stateHash: string | null;
  boardState: Record<string, unknown>;
  hands: {
    player: Partial<Record<string, number>>;
    enemy: Partial<Record<string, number>>;
  };
};

export type BattleGameStatus = {
  status: 'in_progress' | 'finished' | 'aborted';
  result: 'player_win' | 'enemy_win' | 'draw' | 'abort' | null;
  winnerSide: 'player' | 'enemy' | null;
};

export type BattleCommittedMove = {
  moveNo: number;
  actorSide: 'player' | 'enemy';
  move: BattleMove;
  position: BattleCanonicalPosition;
  game: BattleGameStatus;
};

export type BattleAiTurn = {
  selectedMove: BattleMove;
  meta: {
    engineVersion: string;
    thinkMs: number;
    searchedNodes: number;
    searchDepth: number;
    evalCp: number;
    candidateCount: number;
    configApplied: Record<string, unknown>;
  };
  position: BattleCanonicalPosition;
  game: BattleGameStatus;
};

export type BattleLegalMoves = {
  sideToMove: 'player' | 'enemy';
  moveNo: number;
  stateHash: string | null;
  legalMoves: BattleMove[];
};

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

function parseMove(raw: unknown): BattleMove {
  const obj = asRecord(raw);
  if (!obj) {
    throw new Error('move is not an object');
  }

  const toRow = asNumber(obj.toRow ?? obj.to_row);
  const toCol = asNumber(obj.toCol ?? obj.to_col);
  const pieceCode = asString(obj.pieceCode ?? obj.piece_code);
  const fromRow = obj.fromRow ?? obj.from_row ?? null;
  const fromCol = obj.fromCol ?? obj.from_col ?? null;
  if (
    toRow === null ||
    toCol === null ||
    !pieceCode ||
    (fromRow !== null && typeof fromRow !== 'number') ||
    (fromCol !== null && typeof fromCol !== 'number')
  ) {
    throw new Error('move payload is invalid');
  }

  return {
    fromRow: fromRow as number | null,
    fromCol: fromCol as number | null,
    toRow,
    toCol,
    pieceCode,
    promote: Boolean(obj.promote ?? false),
    dropPieceCode: (obj.dropPieceCode ?? obj.drop_piece_code ?? null) as string | null,
    capturedPieceCode: (obj.capturedPieceCode ?? obj.captured_piece_code ?? null) as string | null,
    notation: (obj.notation ?? null) as string | null,
  };
}

function parseHands(raw: unknown): BattleCanonicalPosition['hands'] {
  const obj = asRecord(raw) ?? {};
  return {
    player: (asRecord(obj.player) ?? {}) as Partial<Record<string, number>>,
    enemy: (asRecord(obj.enemy) ?? {}) as Partial<Record<string, number>>,
  };
}

function parsePosition(raw: unknown): BattleCanonicalPosition {
  const obj = asRecord(raw);
  if (!obj) {
    throw new Error('position is not an object');
  }

  const sideToMove = (obj.sideToMove ?? obj.side_to_move) === 'enemy' ? 'enemy' : 'player';
  const turnNumber = asNumber(obj.turnNumber ?? obj.turn_number);
  const moveCount = asNumber(obj.moveCount ?? obj.move_count);
  const sfen = asString(obj.sfen);

  if (turnNumber === null || moveCount === null || !sfen) {
    throw new Error('position payload is invalid');
  }

  return {
    sideToMove,
    turnNumber,
    moveCount,
    sfen,
    stateHash: (obj.stateHash ?? obj.state_hash ?? null) as string | null,
    boardState: (asRecord(obj.boardState ?? obj.board_state) ?? {}) as Record<string, unknown>,
    hands: parseHands(obj.hands),
  };
}

function parseGame(raw: unknown): BattleGameStatus {
  const obj = asRecord(raw);
  if (!obj) {
    throw new Error('game status is not an object');
  }

  const status = asString(obj.status);
  if (status !== 'in_progress' && status !== 'finished' && status !== 'aborted') {
    throw new Error('game status is invalid');
  }

  return {
    status,
    result: (obj.result ?? null) as BattleGameStatus['result'],
    winnerSide: (obj.winnerSide ?? obj.winner_side ?? null) as BattleGameStatus['winnerSide'],
  };
}

export function parseBattleCommittedMove(raw: unknown): BattleCommittedMove {
  const obj = asRecord(raw);
  if (!obj) {
    throw new Error('committed move response is not an object');
  }

  const moveNo = asNumber(obj.moveNo ?? obj.move_no);
  const actorSide = (obj.actorSide ?? obj.actor_side) === 'enemy' ? 'enemy' : 'player';
  if (moveNo === null) {
    throw new Error('moveNo is invalid');
  }

  return {
    moveNo,
    actorSide,
    move: parseMove(obj.move),
    position: parsePosition(obj.position),
    game: parseGame(obj.game),
  };
}

export function parseBattleAiTurn(raw: unknown): BattleAiTurn {
  const obj = asRecord(raw);
  if (!obj) {
    throw new Error('ai turn response is not an object');
  }
  const meta = asRecord(obj.meta);
  if (!meta) {
    throw new Error('ai meta is invalid');
  }

  return {
    selectedMove: parseMove(obj.selectedMove ?? obj.selected_move),
    meta: {
      engineVersion: asString(meta.engineVersion ?? meta.engine_version) ?? '',
      thinkMs: asNumber(meta.thinkMs ?? meta.think_ms) ?? 0,
      searchedNodes: asNumber(meta.searchedNodes ?? meta.searched_nodes) ?? 0,
      searchDepth: asNumber(meta.searchDepth ?? meta.search_depth) ?? 0,
      evalCp: asNumber(meta.evalCp ?? meta.eval_cp) ?? 0,
      candidateCount: asNumber(meta.candidateCount ?? meta.candidate_count) ?? 0,
      configApplied: (asRecord(meta.configApplied ?? meta.config_applied) ?? {}) as Record<
        string,
        unknown
      >,
    },
    position: parsePosition(obj.position),
    game: parseGame(obj.game),
  };
}

export function parseBattleLegalMoves(raw: unknown): BattleLegalMoves {
  const obj = asRecord(raw);
  if (!obj) {
    throw new Error('legal moves response is not an object');
  }

  const moveNo = asNumber(obj.moveNo ?? obj.move_no);
  if (moveNo === null) {
    throw new Error('legal moves moveNo is invalid');
  }

  const rawMoves = Array.isArray(obj.legalMoves ?? obj.legal_moves)
    ? ((obj.legalMoves ?? obj.legal_moves) as unknown[])
    : null;
  if (!rawMoves) {
    throw new Error('legal moves payload is invalid');
  }

  return {
    sideToMove: (obj.sideToMove ?? obj.side_to_move) === 'enemy' ? 'enemy' : 'player',
    moveNo,
    stateHash: (obj.stateHash ?? obj.state_hash ?? null) as string | null,
    legalMoves: rawMoves.map(parseMove),
  };
}
