import { applyMove } from '@/ai/engine/apply-move';
import type { AiBattlePosition, AiPieceDefinition } from '@/ai/model';

const pieceCatalog: AiPieceDefinition[] = [
  {
    pieceCode: 'OU',
    canonicalCode: 'OU',
    sfenCode: 'K',
    char: '王',
    name: '王',
    unlock: 'default',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [
      { dx: -1, dy: -1, maxStep: 1 },
      { dx: 0, dy: -1, maxStep: 1 },
      { dx: 1, dy: -1, maxStep: 1 },
      { dx: -1, dy: 0, maxStep: 1 },
      { dx: 1, dy: 0, maxStep: 1 },
      { dx: -1, dy: 1, maxStep: 1 },
      { dx: 0, dy: 1, maxStep: 1 },
      { dx: 1, dy: 1, maxStep: 1 },
    ],
    isRepeatable: true,
  },
  {
    pieceCode: 'FU',
    canonicalCode: 'FU',
    sfenCode: 'P',
    char: '歩',
    name: '歩',
    unlock: 'default',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [{ dx: 0, dy: -1, maxStep: 1 }],
    isRepeatable: true,
  },
  {
    pieceCode: 'FIRE',
    canonicalCode: 'FIRE',
    sfenCode: 'J',
    char: '火',
    name: '火',
    unlock: 'default',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [{ dx: 0, dy: -1, maxStep: 1 }],
    isRepeatable: true,
  },
  {
    pieceCode: 'WATER',
    canonicalCode: 'WATER',
    sfenCode: 'W',
    char: '水',
    name: '水',
    unlock: 'default',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [{ dx: 0, dy: -1, maxStep: 1 }],
    isRepeatable: true,
  },
  {
    pieceCode: 'NAM',
    canonicalCode: 'NAM',
    sfenCode: 'N',
    char: '波',
    name: '波',
    unlock: 'default',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [{ dx: 0, dy: -1, maxStep: 1 }],
    isRepeatable: true,
  },
  {
    pieceCode: 'MOK',
    canonicalCode: 'MOK',
    sfenCode: 'M',
    char: '木',
    name: '木',
    unlock: 'default',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [{ dx: 0, dy: -1, maxStep: 1 }],
    isRepeatable: true,
  },
  {
    pieceCode: 'HAA',
    canonicalCode: 'HAA',
    sfenCode: 'L',
    char: '葉',
    name: '葉',
    unlock: 'default',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [{ dx: 0, dy: -1, maxStep: 1 }],
    isRepeatable: true,
  },
  {
    pieceCode: 'HOS',
    canonicalCode: 'HOS',
    sfenCode: 'S',
    char: '星',
    name: '星',
    unlock: 'default',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [{ dx: 0, dy: -1, maxStep: 1 }],
    isRepeatable: true,
  },
  {
    pieceCode: 'MAK',
    canonicalCode: 'MAK',
    sfenCode: 'D',
    char: '魔',
    name: '魔',
    unlock: 'default',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [{ dx: 0, dy: -1, maxStep: 1 }],
    isRepeatable: true,
  },
];

describe('ai engine apply move', () => {
  it('applies a legal drop and consumes a hand piece', () => {
    const position: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: '4k4/9/9/9/9/9/9/9/4K4 b P 1',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
      },
      hands: { player: { FU: 1 }, enemy: {} },
    };

    const committed = applyMove({
      position,
      pieceCatalog,
      move: {
        fromRow: null,
        fromCol: null,
        toRow: 6,
        toCol: 3,
        pieceCode: 'FU',
        promote: false,
        dropPieceCode: 'FU',
        capturedPieceCode: null,
        notation: 'FU*63',
      },
    });

    expect(committed.position.hands.player.FU).toBeUndefined();
    expect(committed.position.sideToMove).toBe('enemy');
  });

  it('rejects an illegal move', () => {
    const position: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: '4k4/9/9/9/9/9/9/4P4/4K4 b - 1',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'player', row: 7, col: 4, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
      },
      hands: { player: {}, enemy: {} },
    };

    expect(() =>
      applyMove({
        position,
        pieceCatalog,
        move: {
          fromRow: 7,
          fromCol: 4,
          toRow: 5,
          toCol: 4,
          pieceCode: 'FU',
          promote: false,
          dropPieceCode: null,
          capturedPieceCode: null,
          notation: null,
        },
      }),
    ).toThrow('guardrail rejected move: move is outside session catalog legal range');
  });

  it('applies after_capture return_to_hand to self_piece', () => {
    const position: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: '4k4/9/9/9/4p4/4P4/9/9/4K4 b - 1',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'enemy', row: 4, col: 4, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'player', row: 5, col: 4, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
        skill_definitions_v2: {
          definitions: [
            {
              pieceChars: ['FU'],
              trigger: { type: 'after_capture' },
              effects: [
                {
                  type: 'return_to_hand',
                  target: { group: 'self', selector: 'self_piece' },
                  params: { handOwner: 'self' },
                },
              ],
            },
          ],
        },
      },
      hands: { player: {}, enemy: {} },
    };

    const committed = applyMove({
      position,
      pieceCatalog,
      move: {
        fromRow: 5,
        fromCol: 4,
        toRow: 4,
        toCol: 4,
        pieceCode: 'FU',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: 'FU',
        notation: null,
      },
    });

    expect(
      committed.position.boardState.pieces?.some(
        (piece) =>
          piece.side === 'player' &&
          piece.row === 4 &&
          piece.col === 4 &&
          piece.pieceCode === 'FU',
      ),
    ).toBe(false);
    expect(committed.position.hands.player.FU).toBe(2);
  });

  it('applies summon_piece to adjacent_empty cells', () => {
    const position: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: '4k4/9/9/9/9/4P4/9/9/4K4 b - 1',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'player', row: 5, col: 4, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
        skill_definitions_v2: {
          definitions: [
            {
              pieceChars: ['FU'],
              trigger: { type: 'after_move' },
              effects: [
                {
                  type: 'summon_piece',
                  target: { group: 'adjacent', selector: 'adjacent_empty' },
                  params: { summonPieceCode: 'FU', summonPieceChar: '歩' },
                },
              ],
            },
          ],
        },
      },
      hands: { player: {}, enemy: {} },
    };

    const committed = applyMove({
      position,
      pieceCatalog,
      move: {
        fromRow: 5,
        fromCol: 4,
        toRow: 4,
        toCol: 4,
        pieceCode: 'FU',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: null,
      },
    });

    const summonedCount =
      committed.position.boardState.pieces?.filter(
        (piece) => piece.side === 'player' && piece.pieceCode === 'FU',
      ).length ?? 0;
    // ai.shogi互換: adjacent_empty は最初の空き1マスのみ召喚
    expect(summonedCount).toBe(2);
  });

  it('applies apply_status to adjacent enemy pieces', () => {
    const position: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: '4k4/9/9/9/3p1p3/4P4/9/9/4K4 b - 1',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'enemy', row: 4, col: 3, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'enemy', row: 4, col: 5, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'player', row: 5, col: 4, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
        skill_definitions_v2: {
          definitions: [
            {
              pieceChars: ['FU'],
              trigger: { type: 'after_move' },
              effects: [
                {
                  type: 'apply_status',
                  target: { group: 'adjacent', selector: 'adjacent_enemy' },
                  params: { statusType: 'stun', durationTurns: 2 },
                },
              ],
            },
          ],
        },
      },
      hands: { player: {}, enemy: {} },
    };

    const committed = applyMove({
      position,
      pieceCatalog,
      move: {
        fromRow: 5,
        fromCol: 4,
        toRow: 4,
        toCol: 4,
        pieceCode: 'FU',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: null,
      },
    });

    const skillState = committed.position.boardState.skill_state as
      | { piece_statuses?: Array<{ side?: string; row?: number; col?: number; status_type?: string }> }
      | undefined;
    const statuses = skillState?.piece_statuses ?? [];
    expect(
      statuses.some(
        (s) =>
          s.side === 'enemy' && s.row === 4 && s.col === 3 && s.status_type === 'stun',
      ),
    ).toBe(true);
    expect(
      statuses.some(
        (s) =>
          s.side === 'enemy' && s.row === 4 && s.col === 5 && s.status_type === 'stun',
      ),
    ).toBe(true);
  });

  it('applies remove_piece to one random adjacent enemy only when chance_roll passes', () => {
    const position: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: '4k4/9/9/9/3p1p3/4P4/9/9/4K4 b - 1',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'enemy', row: 4, col: 3, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'enemy', row: 4, col: 5, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'player', row: 5, col: 4, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
        skill_definitions_v2: {
          definitions: [
            {
              pieceChars: ['FU'],
              trigger: { type: 'after_move' },
              conditions: [{ type: 'chance_roll', params: { procChance: 0.2 } }],
              effects: [
                {
                  type: 'remove_piece',
                  target: { group: 'adjacent', selector: 'adjacent_enemy' },
                  params: { randomOne: true },
                },
              ],
            },
          ],
        },
      },
      hands: { player: {}, enemy: {} },
    };

    const randomSpy = jest.spyOn(Math, 'random');
    // 1回目: chance_roll 成功 (<=0.2), 2回目: 候補 index を選択
    randomSpy.mockReturnValueOnce(0.1).mockReturnValueOnce(0.75);
    const committed = applyMove({
      position,
      pieceCatalog,
      move: {
        fromRow: 5,
        fromCol: 4,
        toRow: 4,
        toCol: 4,
        pieceCode: 'FU',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: null,
      },
    });
    randomSpy.mockRestore();

    const remainingAdjacentEnemy =
      committed.position.boardState.pieces?.filter(
        (piece) => piece.side === 'enemy' && piece.row === 4 && (piece.col === 3 || piece.col === 5),
      ) ?? [];
    expect(remainingAdjacentEnemy).toHaveLength(1);
  });

  it('does not apply remove_piece when chance_roll fails', () => {
    const position: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: '4k4/9/9/9/3p1p3/4P4/9/9/4K4 b - 1',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'enemy', row: 4, col: 3, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'enemy', row: 4, col: 5, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'player', row: 5, col: 4, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
        skill_definitions_v2: {
          definitions: [
            {
              pieceChars: ['FU'],
              trigger: { type: 'after_move' },
              conditions: [{ type: 'chance_roll', params: { procChance: 0.2 } }],
              effects: [
                {
                  type: 'remove_piece',
                  target: { group: 'adjacent', selector: 'adjacent_enemy' },
                  params: { randomOne: true },
                },
              ],
            },
          ],
        },
      },
      hands: { player: {}, enemy: {} },
    };

    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.9);
    const committed = applyMove({
      position,
      pieceCatalog,
      move: {
        fromRow: 5,
        fromCol: 4,
        toRow: 4,
        toCol: 4,
        pieceCode: 'FU',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: null,
      },
    });
    randomSpy.mockRestore();

    const remainingAdjacentEnemy =
      committed.position.boardState.pieces?.filter(
        (piece) => piece.side === 'enemy' && piece.row === 4 && (piece.col === 3 || piece.col === 5),
      ) ?? [];
    expect(remainingAdjacentEnemy).toHaveLength(2);
  });

  it('fire skill removes one enemy hand piece when proc succeeds', () => {
    const position: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: '4k4/9/9/9/9/4P4/9/9/4K4 b - 1',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'player', row: 5, col: 4, pieceCode: 'FIRE', char: '火', promoted: false },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
      },
      hands: { player: {}, enemy: { FU: 1, KI: 1 } },
    };

    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.1);
    const committed = applyMove({
      position,
      pieceCatalog,
      move: {
        fromRow: 5,
        fromCol: 4,
        toRow: 4,
        toCol: 4,
        pieceCode: 'FIRE',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: null,
      },
    });
    randomSpy.mockRestore();

    const enemyHandTotal = Object.values(committed.position.hands.enemy).reduce(
      (sum, value) => sum + (typeof value === 'number' ? value : 0),
      0,
    );
    expect(enemyHandTotal).toBe(1);
  });

  it('fire skill does not remove enemy hand piece when proc fails', () => {
    const position: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: '4k4/9/9/9/9/4P4/9/9/4K4 b - 1',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'player', row: 5, col: 4, pieceCode: 'FIRE', char: '火', promoted: false },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
      },
      hands: { player: {}, enemy: { FU: 1, KI: 1 } },
    };

    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.9);
    const committed = applyMove({
      position,
      pieceCatalog,
      move: {
        fromRow: 5,
        fromCol: 4,
        toRow: 4,
        toCol: 4,
        pieceCode: 'FIRE',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: null,
      },
    });
    randomSpy.mockRestore();

    const enemyHandTotal = Object.values(committed.position.hands.enemy).reduce(
      (sum, value) => sum + (typeof value === 'number' ? value : 0),
      0,
    );
    expect(enemyHandTotal).toBe(2);
  });

  it('water skill pushes adjacent enemy pieces by one cell', () => {
    const position: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: '4k4/9/9/9/3p1p3/4W4/9/9/4K4 b - 1',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'enemy', row: 4, col: 3, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'enemy', row: 4, col: 5, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'player', row: 5, col: 4, pieceCode: 'WATER', char: '水', promoted: false },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
      },
      hands: { player: {}, enemy: {} },
    };

    const committed = applyMove({
      position,
      pieceCatalog,
      move: {
        fromRow: 5,
        fromCol: 4,
        toRow: 4,
        toCol: 4,
        pieceCode: 'WATER',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: null,
      },
    });

    const enemyAt42 = committed.position.boardState.pieces?.find(
      (piece) => piece.side === 'enemy' && piece.row === 4 && piece.col === 2,
    );
    const enemyAt46 = committed.position.boardState.pieces?.find(
      (piece) => piece.side === 'enemy' && piece.row === 4 && piece.col === 6,
    );
    expect(enemyAt42?.pieceCode).toBe('FU');
    expect(enemyAt46?.pieceCode).toBe('FU');
  });

  it('wave skill pushes adjacent enemy pieces by one cell', () => {
    const position: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: '4k4/9/9/9/3p1p3/4N4/9/9/4K4 b - 1',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'enemy', row: 4, col: 3, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'enemy', row: 4, col: 5, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'player', row: 5, col: 4, pieceCode: 'NAM', char: '波', promoted: false },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
      },
      hands: { player: {}, enemy: {} },
    };

    const committed = applyMove({
      position,
      pieceCatalog,
      move: {
        fromRow: 5,
        fromCol: 4,
        toRow: 4,
        toCol: 4,
        pieceCode: 'NAM',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: null,
      },
    });

    const enemyAt42 = committed.position.boardState.pieces?.find(
      (piece) => piece.side === 'enemy' && piece.row === 4 && piece.col === 2,
    );
    const enemyAt46 = committed.position.boardState.pieces?.find(
      (piece) => piece.side === 'enemy' && piece.row === 4 && piece.col === 6,
    );
    expect(enemyAt42?.pieceCode).toBe('FU');
    expect(enemyAt46?.pieceCode).toBe('FU');
  });

  it('wood skill summons one wood piece when proc succeeds', () => {
    const position: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: '4k4/9/9/9/9/4M4/9/9/4K4 b - 1',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'player', row: 5, col: 4, pieceCode: 'MOK', char: '木', promoted: false },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
      },
      hands: { player: {}, enemy: {} },
    };

    const randomSpy = jest.spyOn(Math, 'random');
    randomSpy.mockReturnValueOnce(0.05); // 10% 抽選成功
    randomSpy.mockReturnValueOnce(0.4); // 候補セル index
    const committed = applyMove({
      position,
      pieceCatalog,
      move: {
        fromRow: 5,
        fromCol: 4,
        toRow: 4,
        toCol: 4,
        pieceCode: 'MOK',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: null,
      },
    });
    randomSpy.mockRestore();

    const woodCount =
      committed.position.boardState.pieces?.filter(
        (piece) => piece.side === 'player' && piece.pieceCode === 'MOK',
      ).length ?? 0;
    expect(woodCount).toBe(2);
  });

  it('leaf skill summons one leaf piece when proc succeeds', () => {
    const position: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: '4k4/9/9/9/9/4L4/9/9/4K4 b - 1',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'player', row: 5, col: 4, pieceCode: 'HAA', char: '葉', promoted: false },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
      },
      hands: { player: {}, enemy: {} },
    };

    const randomSpy = jest.spyOn(Math, 'random');
    randomSpy.mockReturnValueOnce(0.05); // 10% 抽選成功
    randomSpy.mockReturnValueOnce(0.6); // 候補セル index
    const committed = applyMove({
      position,
      pieceCatalog,
      move: {
        fromRow: 5,
        fromCol: 4,
        toRow: 4,
        toCol: 4,
        pieceCode: 'HAA',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: null,
      },
    });
    randomSpy.mockRestore();

    const leafCount =
      committed.position.boardState.pieces?.filter(
        (piece) => piece.side === 'player' && piece.pieceCode === 'HAA',
      ).length ?? 0;
    expect(leafCount).toBe(2);
  });

  it('star skill returns captured star to owner hand when proc succeeds', () => {
    const position: AiBattlePosition = {
      sideToMove: 'enemy',
      turnNumber: 1,
      moveCount: 0,
      sfen: '9/9/9/4k4/4S4/9/9/9/4K4 w - 1',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 3, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'player', row: 4, col: 4, pieceCode: 'HOS', char: '星', promoted: false },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
      },
      hands: { player: {}, enemy: {} },
    };

    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.1);
    const committed = applyMove({
      position,
      pieceCatalog,
      move: {
        fromRow: 3,
        fromCol: 4,
        toRow: 4,
        toCol: 4,
        pieceCode: 'OU',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: 'HOS',
        notation: null,
      },
    });
    randomSpy.mockRestore();

    expect(committed.position.hands.player.HOS).toBe(1);
    expect(committed.position.hands.enemy.HOS).toBeUndefined();
    expect(committed.skillTriggered).toBe(true);
  });

  it('star skill gives captured star to capturer hand when proc fails', () => {
    const position: AiBattlePosition = {
      sideToMove: 'enemy',
      turnNumber: 1,
      moveCount: 0,
      sfen: '9/9/9/4k4/4S4/9/9/9/4K4 w - 1',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 3, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'player', row: 4, col: 4, pieceCode: 'HOS', char: '星', promoted: false },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
      },
      hands: { player: {}, enemy: {} },
    };

    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.9);
    const committed = applyMove({
      position,
      pieceCatalog,
      move: {
        fromRow: 3,
        fromCol: 4,
        toRow: 4,
        toCol: 4,
        pieceCode: 'OU',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: 'HOS',
        notation: null,
      },
    });
    randomSpy.mockRestore();

    expect(committed.position.hands.player.HOS).toBeUndefined();
    expect(committed.position.hands.enemy.HOS).toBe(1);
    expect(committed.skillTriggered).toBe(false);
  });

  it('demon skill removes up to two adjacent enemies when proc succeeds', () => {
    const position: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: '4k4/9/9/9/3p1p3/4D4/9/9/4K4 b - 1',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'enemy', row: 4, col: 3, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'enemy', row: 4, col: 5, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'player', row: 5, col: 4, pieceCode: 'MAK', char: '魔', promoted: false },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
      },
      hands: { player: {}, enemy: {} },
    };

    const randomSpy = jest.spyOn(Math, 'random');
    randomSpy.mockReturnValueOnce(0.05); // 10%抽選成功
    randomSpy.mockReturnValueOnce(0.1); // 1体目選択
    randomSpy.mockReturnValueOnce(0.1); // 2体目選択
    const committed = applyMove({
      position,
      pieceCatalog,
      move: {
        fromRow: 5,
        fromCol: 4,
        toRow: 4,
        toCol: 4,
        pieceCode: 'MAK',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: null,
      },
    });
    randomSpy.mockRestore();

    const remainingAdjacentEnemies =
      committed.position.boardState.pieces?.filter(
        (piece) => piece.side === 'enemy' && piece.row === 4 && (piece.col === 3 || piece.col === 5),
      ) ?? [];
    expect(remainingAdjacentEnemies).toHaveLength(0);
  });

  it('demon skill does not remove adjacent enemies when proc fails', () => {
    const position: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: '4k4/9/9/9/3p1p3/4D4/9/9/4K4 b - 1',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'enemy', row: 4, col: 3, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'enemy', row: 4, col: 5, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'player', row: 5, col: 4, pieceCode: 'MAK', char: '魔', promoted: false },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
      },
      hands: { player: {}, enemy: {} },
    };

    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.9); // 10%抽選失敗
    const committed = applyMove({
      position,
      pieceCatalog,
      move: {
        fromRow: 5,
        fromCol: 4,
        toRow: 4,
        toCol: 4,
        pieceCode: 'MAK',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: null,
      },
    });
    randomSpy.mockRestore();

    const remainingAdjacentEnemies =
      committed.position.boardState.pieces?.filter(
        (piece) => piece.side === 'enemy' && piece.row === 4 && (piece.col === 3 || piece.col === 5),
      ) ?? [];
    expect(remainingAdjacentEnemies).toHaveLength(2);
  });
});
