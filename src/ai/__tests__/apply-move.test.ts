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
    pieceCode: 'IRON',
    canonicalCode: 'IRON',
    sfenCode: 'O',
    char: '鉄',
    name: '鉄',
    unlock: 'default',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [{ dx: 0, dy: -1, maxStep: 1 }],
    isRepeatable: true,
  },
  {
    pieceCode: 'TIN',
    canonicalCode: 'TIN',
    sfenCode: 'Z',
    char: '錫',
    name: '錫',
    unlock: 'default',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [{ dx: 0, dy: -1, maxStep: 1 }],
    isRepeatable: true,
  },
  {
    pieceCode: 'ELECTRIC',
    canonicalCode: 'ELECTRIC',
    sfenCode: '&',
    char: '電',
    name: '電',
    unlock: 'default',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [{ dx: 0, dy: -1, maxStep: 1 }],
    isRepeatable: true,
  },
  {
    pieceCode: 'THUNDER',
    canonicalCode: 'THUNDER',
    sfenCode: '(',
    char: '雷',
    name: '雷',
    unlock: 'default',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [{ dx: 0, dy: -1, maxStep: 1 }],
    isRepeatable: true,
  },
  {
    pieceCode: 'TIME',
    canonicalCode: 'TIME',
    sfenCode: '#',
    char: '時',
    name: '時',
    unlock: 'default',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [{ dx: 0, dy: -1, maxStep: 1 }],
    isRepeatable: true,
  },
  {
    pieceCode: 'ICE',
    canonicalCode: 'ICE',
    sfenCode: '@',
    char: '氷',
    name: '氷',
    unlock: 'default',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [{ dx: 0, dy: -1, maxStep: 1 }],
    isRepeatable: true,
  },
  {
    pieceCode: 'SNOW',
    canonicalCode: 'SNOW',
    sfenCode: '^',
    char: '雪',
    name: '雪',
    unlock: 'default',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [{ dx: 0, dy: -1, maxStep: 1 }],
    isRepeatable: true,
  },
  {
    pieceCode: 'SAND',
    canonicalCode: 'SAND',
    sfenCode: '[',
    char: '砂',
    name: '砂',
    unlock: 'default',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [{ dx: 0, dy: -1, maxStep: 1 }],
    isRepeatable: true,
  },
  {
    pieceCode: 'WIND',
    canonicalCode: 'WIND',
    sfenCode: '<',
    char: '風',
    name: '風',
    unlock: 'default',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [{ dx: 0, dy: -1, maxStep: 1 }],
    isRepeatable: true,
  },
  {
    pieceCode: 'FISH',
    canonicalCode: 'FISH',
    sfenCode: ':',
    char: '魚',
    name: '魚',
    unlock: 'default',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [{ dx: 0, dy: -1, maxStep: 1 }],
    isRepeatable: true,
  },
  {
    pieceCode: 'MOSS',
    canonicalCode: 'MOSS',
    sfenCode: '{',
    char: '苔',
    name: '苔',
    unlock: 'default',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [{ dx: 0, dy: -1, maxStep: 1 }],
    isRepeatable: true,
  },
  {
    pieceCode: 'RAINBOW',
    canonicalCode: 'RAINBOW',
    sfenCode: '"',
    char: '虹',
    name: '虹',
    unlock: 'default',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [{ dx: 0, dy: -1, maxStep: 1 }],
    isRepeatable: true,
  },
  {
    pieceCode: 'CLOUD',
    canonicalCode: 'CLOUD',
    sfenCode: ',',
    char: '雲',
    name: '雲',
    unlock: 'default',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [{ dx: 0, dy: -1, maxStep: 1 }],
    isRepeatable: true,
  },
  {
    pieceCode: 'SWAMP',
    canonicalCode: 'SWAMP',
    sfenCode: '|',
    char: '沼',
    name: '沼',
    unlock: 'default',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [{ dx: 0, dy: -1, maxStep: 1 }],
    isRepeatable: true,
  },
  {
    pieceCode: 'POISON',
    canonicalCode: 'POISON',
    sfenCode: ';',
    char: '毒',
    name: '毒',
    unlock: 'default',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [{ dx: 0, dy: -1, maxStep: 1 }],
    isRepeatable: true,
  },
  {
    pieceCode: 'A',
    canonicalCode: 'A',
    sfenCode: 'a',
    char: 'あ',
    name: 'あ',
    unlock: 'default',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [{ dx: 0, dy: -1, maxStep: 1 }],
    isRepeatable: true,
  },
  {
    pieceCode: 'TREASURE',
    canonicalCode: 'TREASURE',
    sfenCode: '$',
    char: '宝',
    name: '宝',
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

  it('iron skill pushes adjacent enemy pieces by one cell like water', () => {
    const position: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: '4k4/9/9/9/3p1p3/4O4/9/9/4K4 b - 1',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'enemy', row: 4, col: 3, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'enemy', row: 4, col: 5, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'player', row: 5, col: 4, pieceCode: 'IRON', char: '鉄', promoted: false },
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
        pieceCode: 'IRON',
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

  it('tin skill applies stun to adjacent enemies when 10% proc succeeds', () => {
    const position: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: '4k4/9/9/9/3p1p3/4Z4/9/9/4K4 b - 1',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'enemy', row: 4, col: 3, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'enemy', row: 4, col: 5, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'player', row: 5, col: 4, pieceCode: 'TIN', char: '錫', promoted: false },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
      },
      hands: { player: {}, enemy: {} },
    };

    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.05);
    const committed = applyMove({
      position,
      pieceCatalog,
      move: {
        fromRow: 5,
        fromCol: 4,
        toRow: 4,
        toCol: 4,
        pieceCode: 'TIN',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: null,
      },
    });
    randomSpy.mockRestore();

    const skillState = committed.position.boardState.skill_state as
      | { piece_statuses?: Array<Record<string, unknown>> }
      | undefined;
    const statuses = skillState?.piece_statuses ?? [];
    const stuns = statuses.filter((s) => (s.status_type as string) === 'stun');
    expect(stuns.length).toBeGreaterThanOrEqual(1);
    expect(stuns.every((s) => (s.remaining_turns as number) === 2)).toBe(true);
  });

  it('treasure skill adds one random KI/GI/COPPER to hand when 20% proc succeeds', () => {
    const position: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: '4k4/9/9/9/9/4$4/9/9/4K4 b - 1',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'player', row: 5, col: 4, pieceCode: 'TREASURE', char: '宝', promoted: false },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
      },
      hands: { player: {}, enemy: {} },
    };

    const randomSpy = jest.spyOn(Math, 'random');
    randomSpy.mockReturnValueOnce(0.05); // 20% 発動成功
    randomSpy.mockReturnValueOnce(0.8); // reward index => COPPER
    const committed = applyMove({
      position,
      pieceCatalog,
      move: {
        fromRow: 5,
        fromCol: 4,
        toRow: 4,
        toCol: 4,
        pieceCode: 'TREASURE',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: null,
      },
    });
    randomSpy.mockRestore();

    expect(committed.position.hands.player.COPPER).toBe(1);
    expect(committed.position.hands.player.KI).toBeUndefined();
    expect(committed.position.hands.player.GI).toBeUndefined();
  });

  it('electric skill stuns one adjacent enemy for 3 turns when 20% proc succeeds', () => {
    const position: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: '4k4/9/9/9/3p1p3/4&4/9/9/4K4 b - 1',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'enemy', row: 4, col: 3, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'enemy', row: 4, col: 5, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'player', row: 5, col: 4, pieceCode: 'ELECTRIC', char: '電', promoted: false },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
      },
      hands: { player: {}, enemy: {} },
    };

    const randomSpy = jest.spyOn(Math, 'random');
    randomSpy.mockReturnValueOnce(0.05); // 20% 発動成功
    randomSpy.mockReturnValueOnce(0.0); // adjacent target index
    const committed = applyMove({
      position,
      pieceCatalog,
      move: {
        fromRow: 5,
        fromCol: 4,
        toRow: 4,
        toCol: 4,
        pieceCode: 'ELECTRIC',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: null,
      },
    });
    randomSpy.mockRestore();

    const skillState = committed.position.boardState.skill_state as
      | { piece_statuses?: Array<Record<string, unknown>> }
      | undefined;
    const statuses = skillState?.piece_statuses ?? [];
    const stuns = statuses.filter((s) => (s.status_type as string) === 'stun');
    expect(stuns).toHaveLength(1);
    expect(stuns[0]?.remaining_turns).toBe(3);
  });

  it('thunder skill removes up to two random enemy hand pieces when 10% proc succeeds', () => {
    const position: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: '4k4/9/9/9/9/4(4/9/9/4K4 b - 1',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'player', row: 5, col: 4, pieceCode: 'THUNDER', char: '雷', promoted: false },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
      },
      hands: { player: {}, enemy: { FU: 1, GI: 1, KI: 1 } },
    };

    const randomSpy = jest.spyOn(Math, 'random');
    randomSpy.mockReturnValueOnce(0.05); // 10% 発動成功
    randomSpy.mockReturnValueOnce(0.0); // first remove key index
    randomSpy.mockReturnValueOnce(0.0); // second remove key index (recomputed keys)
    const committed = applyMove({
      position,
      pieceCatalog,
      move: {
        fromRow: 5,
        fromCol: 4,
        toRow: 4,
        toCol: 4,
        pieceCode: 'THUNDER',
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

  it('time piece can move one step in all directions', () => {
    const position: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: '4k4/9/9/9/9/4#4/9/9/4K4 b - 1',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'player', row: 5, col: 4, pieceCode: 'TIME', char: '時', promoted: false },
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
        toCol: 3,
        pieceCode: 'TIME',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: 'time_normal',
      },
    });

    const moved = committed.position.boardState.pieces?.find(
      (piece) => piece.side === 'player' && piece.pieceCode === 'TIME',
    );
    expect(moved?.row).toBe(4);
    expect(moved?.col).toBe(3);
    expect(committed.skillTriggered).toBe(false);
  });

  it('time skill only stuns adjacent enemies for 4 turns', () => {
    const position: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: '4k4/9/9/9/3p1p3/4#4/9/9/4K4 b - 1',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'enemy', row: 4, col: 3, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'enemy', row: 4, col: 5, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'player', row: 5, col: 4, pieceCode: 'TIME', char: '時', promoted: false },
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
        toRow: 5,
        toCol: 4,
        pieceCode: 'TIME',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: 'time_skill_only',
      },
    });

    const skillState = committed.position.boardState.skill_state as
      | { piece_statuses?: Array<Record<string, unknown>> }
      | undefined;
    const statuses = skillState?.piece_statuses ?? [];
    const stuns = statuses.filter((s) => (s.status_type as string) === 'stun');
    expect(stuns).toHaveLength(2);
    expect(stuns.every((s) => (s.remaining_turns as number) === 4)).toBe(true);
  });

  it('ice skill stuns one adjacent enemy for 2 turns when 30% proc succeeds', () => {
    const position: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: '4k4/9/9/9/3p1p3/4@4/9/9/4K4 b - 1',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'enemy', row: 4, col: 3, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'enemy', row: 4, col: 5, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'player', row: 5, col: 4, pieceCode: 'ICE', char: '氷', promoted: false },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
      },
      hands: { player: {}, enemy: {} },
    };

    const randomSpy = jest.spyOn(Math, 'random');
    randomSpy.mockReturnValueOnce(0.1); // 30% 発動成功
    randomSpy.mockReturnValueOnce(0.0); // target index
    const committed = applyMove({
      position,
      pieceCatalog,
      move: {
        fromRow: 5,
        fromCol: 4,
        toRow: 4,
        toCol: 4,
        pieceCode: 'ICE',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: null,
      },
    });
    randomSpy.mockRestore();

    const skillState = committed.position.boardState.skill_state as
      | { piece_statuses?: Array<Record<string, unknown>> }
      | undefined;
    const statuses = skillState?.piece_statuses ?? [];
    const stuns = statuses.filter((s) => (s.status_type as string) === 'stun');
    expect(stuns).toHaveLength(1);
    expect(stuns[0]?.remaining_turns).toBe(2);
  });

  it('snow skill adds ICE to hand when 20% proc succeeds', () => {
    const position: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: '4k4/9/9/9/9/4^4/9/9/4K4 b - 1',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'player', row: 5, col: 4, pieceCode: 'SNOW', char: '雪', promoted: false },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
      },
      hands: { player: {}, enemy: {} },
    };

    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.05);
    const committed = applyMove({
      position,
      pieceCatalog,
      move: {
        fromRow: 5,
        fromCol: 4,
        toRow: 4,
        toCol: 4,
        pieceCode: 'SNOW',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: null,
      },
    });
    randomSpy.mockRestore();

    expect(committed.position.hands.player.ICE).toBe(1);
  });

  it('sand skill moves adjacent ally sand in linked movement', () => {
    const position: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: '4k4/9/9/9/9/3[[4/9/9/4K4 b - 1',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'player', row: 5, col: 3, pieceCode: 'SAND', char: '砂', promoted: false },
          { side: 'player', row: 5, col: 4, pieceCode: 'SAND', char: '砂', promoted: false },
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
        pieceCode: 'SAND',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: null,
      },
    });

    const linked = committed.position.boardState.pieces?.find(
      (piece) => piece.side === 'player' && piece.pieceCode === 'SAND' && piece.col === 3,
    );
    expect(linked?.row).toBe(4);
    expect(linked?.col).toBe(3);
  });

  it('wind skill pushes orthogonal adjacent enemies to edge', () => {
    const position: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: '4k4/9/9/9/4p4/3<p4/9/9/4K4 b - 1',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'enemy', row: 4, col: 4, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'enemy', row: 5, col: 4, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'player', row: 5, col: 3, pieceCode: 'WIND', char: '風', promoted: false },
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
        fromCol: 3,
        toRow: 4,
        toCol: 3,
        pieceCode: 'WIND',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: null,
      },
    });

    const pushedRight = committed.position.boardState.pieces?.find(
      (piece) => piece.side === 'enemy' && piece.col === 8 && piece.row === 4,
    );
    expect(pushedRight?.pieceCode).toBe('FU');
  });

  it('fish skill stuns one adjacent enemy for 3 turns when 30% proc succeeds', () => {
    const position: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: '4k4/9/9/9/3p1p3/4:4/9/9/4K4 b - 1',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'enemy', row: 4, col: 3, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'enemy', row: 4, col: 5, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'player', row: 5, col: 4, pieceCode: 'FISH', char: '魚', promoted: false },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
      },
      hands: { player: {}, enemy: {} },
    };

    const randomSpy = jest.spyOn(Math, 'random');
    randomSpy.mockReturnValueOnce(0.1); // 30% 発動成功
    randomSpy.mockReturnValueOnce(0.0); // target index
    const committed = applyMove({
      position,
      pieceCatalog,
      move: {
        fromRow: 5,
        fromCol: 4,
        toRow: 4,
        toCol: 4,
        pieceCode: 'FISH',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: null,
      },
    });
    randomSpy.mockRestore();

    const skillState = committed.position.boardState.skill_state as
      | { piece_statuses?: Array<Record<string, unknown>> }
      | undefined;
    const statuses = skillState?.piece_statuses ?? [];
    const stuns = statuses.filter((s) => (s.status_type as string) === 'stun');
    expect(stuns).toHaveLength(1);
    expect(stuns[0]?.remaining_turns).toBe(3);
  });

  it('moss skill summons one moss piece when 30% proc succeeds', () => {
    const position: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: '4k4/9/9/9/9/4{4/9/9/4K4 b - 1',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'player', row: 5, col: 4, pieceCode: 'MOSS', char: '苔', promoted: false },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
      },
      hands: { player: {}, enemy: {} },
    };

    const randomSpy = jest.spyOn(Math, 'random');
    randomSpy.mockReturnValueOnce(0.1); // 30% 発動成功
    randomSpy.mockReturnValueOnce(0.0); // summon candidate index
    const committed = applyMove({
      position,
      pieceCatalog,
      move: {
        fromRow: 5,
        fromCol: 4,
        toRow: 4,
        toCol: 4,
        pieceCode: 'MOSS',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: null,
      },
    });
    randomSpy.mockRestore();

    const mossCount =
      committed.position.boardState.pieces?.filter(
        (piece) => piece.side === 'player' && piece.pieceCode === 'MOSS',
      ).length ?? 0;
    expect(mossCount).toBe(2);
  });

  it('rainbow skill applies orthogonal-step movement restriction to adjacent enemies', () => {
    const position: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: '4k4/9/9/9/3p1p3/4"4/9/9/4K4 b - 1',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'enemy', row: 4, col: 3, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'enemy', row: 4, col: 5, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'player', row: 5, col: 4, pieceCode: 'RAINBOW', char: '虹', promoted: false },
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
        pieceCode: 'RAINBOW',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: null,
      },
    });

    const skillState = committed.position.boardState.skill_state as
      | { movement_modifiers?: Array<Record<string, unknown>> }
      | undefined;
    const modifiers = skillState?.movement_modifiers ?? [];
    const ortho = modifiers.filter((m) => (m.movement_rule as string) === 'orthogonal_step_only');
    expect(ortho.length).toBeGreaterThanOrEqual(1);
    expect(ortho.every((m) => (m.remaining_turns as number) === 2)).toBe(true);
  });

  it('cloud piece captures allied piece and adds it to hand', () => {
    const position: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: '4k4/9/9/9/4P4/4,4/9/9/4K4 b - 1',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'player', row: 4, col: 4, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'player', row: 5, col: 4, pieceCode: 'CLOUD', char: '雲', promoted: false },
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
        pieceCode: 'CLOUD',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: 'FU',
        notation: null,
      },
    });
    const pieces = committed.position.boardState.pieces as Array<{
      side: 'player' | 'enemy';
      row: number;
      col: number;
      pieceCode: string;
    }>;
    expect(pieces.some((piece) => piece.side === 'player' && piece.row === 4 && piece.col === 4 && piece.pieceCode === 'CLOUD')).toBe(true);
    expect(pieces.some((piece) => piece.side === 'player' && piece.row === 4 && piece.col === 4 && piece.pieceCode === 'FU')).toBe(false);
    expect(committed.position.hands.player.FU ?? 0).toBe(1);
  });

  it('swamp skill applies vertical-step movement restriction to adjacent enemies', () => {
    const position: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: '4k4/9/9/9/3p1p3/4|4/9/9/4K4 b - 1',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'enemy', row: 4, col: 3, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'enemy', row: 4, col: 5, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'player', row: 5, col: 4, pieceCode: 'SWAMP', char: '沼', promoted: false },
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
        pieceCode: 'SWAMP',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: null,
      },
    });

    const skillState = committed.position.boardState.skill_state as
      | { movement_modifiers?: Array<Record<string, unknown>> }
      | undefined;
    const modifiers = skillState?.movement_modifiers ?? [];
    const verticalOnly = modifiers.filter((m) => (m.movement_rule as string) === 'vertical_step_only');
    expect(verticalOnly.length).toBeGreaterThanOrEqual(1);
    expect(verticalOnly.every((m) => (m.remaining_turns as number) === 2)).toBe(true);
  });

  it('poison skill creates origin poison cell with 4 turns', () => {
    const position: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: '4k4/9/9/9/9/4;4/9/9/4K4 b - 1',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'player', row: 5, col: 4, pieceCode: 'POISON', char: '毒', promoted: false },
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
        pieceCode: 'POISON',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: null,
      },
    });
    const hazards = ((committed.position.boardState.skill_state as { board_hazards?: Array<Record<string, unknown>> })
      ?.board_hazards ?? []) as Array<Record<string, unknown>>;
    expect(
      hazards.some(
        (h) =>
          h.row === 5 &&
          h.col === 4 &&
          h.hazard_type === 'poison_cell' &&
          h.affects_side === 'enemy' &&
          h.remaining_turns === 4,
      ),
    ).toBe(true);
  });

  it('enemy piece is removed when stepping onto poison cell', () => {
    const position: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 2,
      moveCount: 1,
      sfen: '4k4/9/9/9/9/4P4/9/9/4K4 b - 1',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'player', row: 5, col: 4, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
        skill_state: {
          board_hazards: [
            {
              row: 4,
              col: 4,
              hazard_type: 'poison_cell',
              affects_side: 'player',
              remaining_turns: 3,
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
    const pieces = committed.position.boardState.pieces as Array<{ side: 'player' | 'enemy'; row: number; col: number }>;
    expect(pieces.some((piece) => piece.side === 'player' && piece.row === 4 && piece.col === 4)).toBe(false);
  });

  it('a skill transforms adjacent enemy pieces into pawns', () => {
    const position: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: '4k4/9/9/9/3s1n3/4a4/9/9/4K4 b - 1',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'enemy', row: 4, col: 3, pieceCode: 'GI', char: '銀', promoted: false },
          { side: 'enemy', row: 4, col: 5, pieceCode: 'KE', char: '桂', promoted: false },
          { side: 'player', row: 5, col: 4, pieceCode: 'A', char: 'あ', promoted: false },
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
        pieceCode: 'A',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: null,
      },
    });
    const pieces = committed.position.boardState.pieces as Array<{
      side: 'player' | 'enemy';
      row: number;
      col: number;
      pieceCode: string;
      char: string;
    }>;
    const left = pieces.find((p) => p.side === 'enemy' && p.row === 4 && p.col === 3);
    const right = pieces.find((p) => p.side === 'enemy' && p.row === 4 && p.col === 5);
    expect(left?.pieceCode).toBe('FU');
    expect(left?.char).toBe('歩');
    expect(right?.pieceCode).toBe('FU');
    expect(right?.char).toBe('歩');
    const skillState = (committed.position.boardState as { skill_state?: { piece_statuses?: Array<Record<string, unknown>> } })
      .skill_state;
    const statuses = skillState?.piece_statuses ?? [];
    expect(
      statuses.some(
        (status) =>
          status.status_type === 'a_transform' &&
          status.side === 'enemy' &&
          status.row === 4 &&
          status.col === 3,
      ),
    ).toBe(true);
    expect(
      statuses.some(
        (status) =>
          status.status_type === 'a_transform' &&
          status.side === 'enemy' &&
          status.row === 4 &&
          status.col === 5,
      ),
    ).toBe(true);
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

  it('keeps original char after moving piece with opaque pieceCode', () => {
    const position: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: '4k4/9/9/9/9/4x4/9/9/4K4 b - 1',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'player', row: 5, col: 4, pieceCode: 'BA421EA0D85', char: '歩', promoted: false },
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
        pieceCode: 'BA421EA0D85',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: null,
      },
    });
    const pieces = committed.position.boardState.pieces as Array<{ row: number; col: number; char: string }>;
    const moved = pieces.find((piece) => piece.row === 4 && piece.col === 4);
    expect(moved?.char).toBe('歩');
  });
});
