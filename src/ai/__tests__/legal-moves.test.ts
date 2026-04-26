import { generateLegalMoves } from '@/ai/engine/legal-moves';
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
    pieceCode: 'KI',
    canonicalCode: 'KI',
    sfenCode: 'G',
    char: '金',
    name: '金',
    unlock: 'default',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [{ dx: 0, dy: -1, maxStep: 1 }],
    isRepeatable: true,
  },
  {
    pieceCode: 'KE',
    canonicalCode: 'KE',
    sfenCode: 'N',
    char: '桂',
    name: '桂',
    unlock: 'default',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [
      { dx: -1, dy: -2, maxStep: 1 },
      { dx: 1, dy: -2, maxStep: 1 },
    ],
    isRepeatable: true,
  },
  {
    pieceCode: 'KA',
    canonicalCode: 'KA',
    sfenCode: 'B',
    char: '角',
    name: '角',
    unlock: 'default',
    desc: '',
    skill: '',
    move: '',
    // 敢えて maxStep: 1 を与え、生成側の角専用補正で 9 歩化されることを確認する。
    moveVectors: [
      { dx: -1, dy: -1, maxStep: 1 },
      { dx: 1, dy: -1, maxStep: 1 },
      { dx: -1, dy: 1, maxStep: 1 },
      { dx: 1, dy: 1, maxStep: 1 },
    ],
    isRepeatable: true,
  },
  {
    pieceCode: 'HIK',
    canonicalCode: 'HIK',
    sfenCode: '!',
    char: '光',
    name: '光',
    unlock: 'default',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [
      { dx: -1, dy: -1, maxStep: 9 },
      { dx: 1, dy: -1, maxStep: 9 },
      { dx: -1, dy: 1, maxStep: 9 },
      { dx: 1, dy: 1, maxStep: 9 },
    ],
    isRepeatable: true,
  },
  {
    pieceCode: 'HOU',
    canonicalCode: 'HOU',
    sfenCode: 'h',
    char: '砲',
    name: '砲',
    unlock: 'default',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [
      { dx: 0, dy: -1, maxStep: 9, captureMode: 'LeapOverOne' },
      { dx: 0, dy: 1, maxStep: 9, captureMode: 'LeapOverOne' },
      { dx: -1, dy: 0, maxStep: 9, captureMode: 'LeapOverOne' },
      { dx: 1, dy: 0, maxStep: 9, captureMode: 'LeapOverOne' },
    ],
    isRepeatable: true,
  },
];

describe('ai engine legal moves', () => {
  it('keeps king movable after moving once', () => {
    const position: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: '4k4/9/9/9/9/9/9/9/4K4 b - 1',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
      },
      hands: { player: {}, enemy: {} },
    };
    const first = generateLegalMoves({ position, pieceCatalog });
    const kingMoves = first.legalMoves.filter((m) => m.fromRow === 8 && m.fromCol === 4);
    expect(kingMoves.length).toBeGreaterThan(0);
  });

  it('keeps king movable even when char is 玉', () => {
    const position: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 3,
      moveCount: 2,
      sfen: '4k4/9/9/9/9/9/9/4K4/9 b - 1',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'player', row: 7, col: 4, pieceCode: null, char: '玉', promoted: false },
        ],
      },
      hands: { player: {}, enemy: {} },
    };
    const legal = generateLegalMoves({ position, pieceCatalog });
    expect(legal.legalMoves.some((m) => m.fromRow === 7 && m.fromCol === 4)).toBe(true);
  });

  it('enforces mandatory promotion for a pawn entering the last row', () => {
    const position: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: '4k4/4P4/9/9/9/9/9/9/4K4 b - 1',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'player', row: 1, col: 4, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
      },
      hands: { player: {}, enemy: {} },
    };

    const legal = generateLegalMoves({ position, pieceCatalog });
    const pawnMoves = legal.legalMoves.filter((move) => move.fromRow === 1 && move.toRow === 0);

    expect(pawnMoves).toHaveLength(1);
    expect(pawnMoves[0]?.promote).toBe(true);
  });

  it('rejects illegal pawn drops in a file with another unpromoted pawn', () => {
    const position: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: '4k4/9/9/9/9/9/9/4P4/4K4 b P 1',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'player', row: 7, col: 4, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
      },
      hands: { player: { FU: 1 }, enemy: {} },
    };

    const legal = generateLegalMoves({ position, pieceCatalog });

    expect(legal.legalMoves.some((move) => move.dropPieceCode === 'FU' && move.toCol === 4)).toBe(
      false,
    );
  });

  it('blocks moves for stunned pieces from piece_statuses', () => {
    const position: AiBattlePosition = {
      sideToMove: 'enemy',
      turnNumber: 1,
      moveCount: 0,
      sfen: '4k4/9/9/9/9/4p4/9/9/4K4 w - 1',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'enemy', row: 5, col: 4, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
        skill_state: {
          piece_statuses: [
            {
              side: 'enemy',
              row: 5,
              col: 4,
              status_type: 'stun',
              remaining_turns: 2,
            },
          ],
        },
      },
      hands: { player: {}, enemy: {} },
    };

    const legal = generateLegalMoves({ position, pieceCatalog });
    expect(legal.legalMoves.some((move) => move.fromRow === 5 && move.fromCol === 4)).toBe(false);
  });

  it('does not immobilize king even with time_stop status', () => {
    const position: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 3,
      moveCount: 2,
      sfen: '4k4/9/9/9/9/9/9/4K4/9 b - 1',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'player', row: 7, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
        skill_state: {
          piece_statuses: [
            {
              side: 'player',
              row: 7,
              col: 4,
              status_type: 'time_stop',
              remaining_turns: 2,
            },
          ],
        },
      },
      hands: { player: {}, enemy: {} },
    };
    const legal = generateLegalMoves({ position, pieceCatalog });
    expect(legal.legalMoves.some((move) => move.fromRow === 7 && move.fromCol === 4)).toBe(true);
  });

  it('blocks moves for dark_blind pieces', () => {
    const position: AiBattlePosition = {
      sideToMove: 'enemy',
      turnNumber: 3,
      moveCount: 2,
      sfen: '4k4/9/9/9/4p4/9/9/9/4K4 w - 1',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'enemy', row: 4, col: 4, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
        skill_state: {
          piece_statuses: [
            {
              side: 'enemy',
              row: 4,
              col: 4,
              status_type: 'dark_blind',
              remaining_turns: 3,
            },
          ],
        },
      },
      hands: { player: {}, enemy: {} },
    };
    const legal = generateLegalMoves({ position, pieceCatalog });
    expect(legal.legalMoves.some((move) => move.fromRow === 4 && move.fromCol === 4)).toBe(false);
  });

  it('prevents capturing dark_blind covered enemy piece', () => {
    const position: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 3,
      moveCount: 2,
      sfen: '4k4/9/9/9/4p4/5P3/9/9/4K4 b - 1',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'enemy', row: 4, col: 4, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'player', row: 5, col: 5, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
        skill_state: {
          piece_statuses: [
            {
              side: 'enemy',
              row: 4,
              col: 4,
              status_type: 'dark_blind',
              remaining_turns: 3,
            },
          ],
        },
      },
      hands: { player: {}, enemy: {} },
    };
    const legal = generateLegalMoves({ position, pieceCatalog });
    expect(legal.legalMoves.some((move) => move.fromRow === 5 && move.fromCol === 5 && move.toRow === 4 && move.toCol === 4)).toBe(false);
  });

  it('generates reflective diagonal moves for HIK piece', () => {
    const position: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: '4k4/9/9/9/9/4!4/9/9/4K4 b - 1',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'player', row: 5, col: 4, pieceCode: 'HIK', char: '光', promoted: false },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
      },
      hands: { player: {}, enemy: {} },
    };
    const legal = generateLegalMoves({ position, pieceCatalog });
    expect(legal.legalMoves.some((m) => m.fromRow === 5 && m.fromCol === 4 && m.toRow === 4 && m.toCol === 3)).toBe(true);
    expect(legal.legalMoves.some((m) => m.fromRow === 5 && m.fromCol === 4 && m.toRow === 4 && m.toCol === 5)).toBe(true);
  });

  it('allows HOU leap-over-one capture with one platform piece', () => {
    const position: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: '4k4/9/4p4/4p4/4h4/9/9/9/4K4 b - 1',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'enemy', row: 2, col: 4, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'enemy', row: 3, col: 4, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'player', row: 4, col: 4, pieceCode: 'HOU', char: '砲', promoted: false },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
      },
      hands: { player: {}, enemy: {} },
    };
    const legal = generateLegalMoves({ position, pieceCatalog });
    expect(legal.legalMoves.some((m) => m.fromRow === 4 && m.fromCol === 4 && m.toRow === 2 && m.toCol === 4)).toBe(true);
  });

  it('allows KA bishop to move diagonally any distance', () => {
    const position: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: '4k4/9/9/9/4B4/9/9/9/4K4 b - 1',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'player', row: 4, col: 4, pieceCode: 'KA', char: '角', promoted: false },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
      },
      hands: { player: {}, enemy: {} },
    };
    const legal = generateLegalMoves({ position, pieceCatalog });
    expect(legal.legalMoves.some((m) => m.fromRow === 4 && m.fromCol === 4 && m.toRow === 0 && m.toCol === 0)).toBe(true);
    expect(legal.legalMoves.some((m) => m.fromRow === 4 && m.fromCol === 4 && m.toRow === 7 && m.toCol === 7)).toBe(true);
  });

  it('forces KI gold move set to forward/diag-forward/sides/backward only', () => {
    const position: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: '4k4/9/9/9/4G4/9/9/9/4K4 b - 1',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'player', row: 4, col: 4, pieceCode: 'KI', char: '金', promoted: false },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
      },
      hands: { player: {}, enemy: {} },
    };
    const legal = generateLegalMoves({ position, pieceCatalog });
    const goldMoves = legal.legalMoves.filter((m) => m.fromRow === 4 && m.fromCol === 4);
    expect(goldMoves.some((m) => m.toRow === 3 && m.toCol === 3)).toBe(true);
    expect(goldMoves.some((m) => m.toRow === 3 && m.toCol === 4)).toBe(true);
    expect(goldMoves.some((m) => m.toRow === 3 && m.toCol === 5)).toBe(true);
    expect(goldMoves.some((m) => m.toRow === 4 && m.toCol === 3)).toBe(true);
    expect(goldMoves.some((m) => m.toRow === 4 && m.toCol === 5)).toBe(true);
    expect(goldMoves.some((m) => m.toRow === 5 && m.toCol === 4)).toBe(true);
    expect(goldMoves.some((m) => m.toRow === 5 && m.toCol === 3)).toBe(false);
    expect(goldMoves.some((m) => m.toRow === 5 && m.toCol === 5)).toBe(false);
    expect(goldMoves).toHaveLength(6);
  });
});
