import { applyMove } from '@/ai/engine/apply-move';
import { generateLegalMoves } from '@/ai/engine/legal-moves';
import type { AiBattlePosition, AiPieceDefinition } from '@/ai/model';

const pieceCatalog: AiPieceDefinition[] = [
  {
    char: '王',
    name: '王',
    unlock: '',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [],
    isRepeatable: false,
    pieceCode: 'OU',
  },
  {
    char: '閹',
    name: '閹',
    unlock: '',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [],
    isRepeatable: false,
    pieceCode: 'piece_gacha_en',
  },
  {
    char: '歩',
    name: '歩',
    unlock: '',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [{ dx: 0, dy: -1, maxStep: 1 }],
    isRepeatable: false,
    pieceCode: 'FU',
  },
];

describe('閹 味方王の前1マス', () => {
  it('moves orthogonally one step', () => {
    const position: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: 'seed',
      stateHash: 'seed',
      boardState: {
        pieces: [
          {
            side: 'player',
            row: 4,
            col: 4,
            pieceCode: 'piece_gacha_en',
            char: '閹',
            promoted: false,
          },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
      },
      hands: { player: {}, enemy: {} },
    };
    const legal = generateLegalMoves({ position, pieceCatalog });
    const fromEn = legal.legalMoves.filter((m) => m.fromRow === 4 && m.fromCol === 4);
    expect(fromEn.map((m) => `${m.toRow}:${m.toCol}`).sort()).toEqual(
      ['3:4', '4:3', '4:5', '5:4', '7:4'].sort(),
    );
  });

  it('can move to ally king front even when not an adjacent orthogonal step', () => {
    const position: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: 'seed',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          {
            side: 'player',
            row: 5,
            col: 3,
            pieceCode: 'piece_gacha_en',
            char: '閹',
            promoted: false,
          },
          { side: 'player', row: 7, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
      },
      hands: { player: {}, enemy: {} },
    };
    const legal = generateLegalMoves({ position, pieceCatalog });
    const toKingFront = legal.legalMoves.some(
      (m) => m.fromRow === 5 && m.fromCol === 3 && m.toRow === 6 && m.toCol === 4,
    );
    expect(toKingFront).toBe(true);
  });

  it('cannot move to king front when occupied by ally', () => {
    const position: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: 'seed',
      stateHash: 'seed',
      boardState: {
        pieces: [
          {
            side: 'player',
            row: 5,
            col: 3,
            pieceCode: 'piece_gacha_en',
            char: '閹',
            promoted: false,
          },
          { side: 'player', row: 6, col: 4, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'player', row: 7, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
      },
      hands: { player: {}, enemy: {} },
    };
    const legal = generateLegalMoves({ position, pieceCatalog });
    const toKingFront = legal.legalMoves.some(
      (m) => m.fromRow === 5 && m.fromCol === 3 && m.toRow === 6 && m.toCol === 4,
    );
    expect(toKingFront).toBe(false);
  });

  it('applies king-front teleport on commit', () => {
    const start: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: 'seed',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          {
            side: 'player',
            row: 5,
            col: 3,
            pieceCode: 'piece_gacha_en',
            char: '閹',
            promoted: false,
          },
          { side: 'player', row: 7, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
      },
      hands: { player: {}, enemy: {} },
    };

    const committed = applyMove({
      position: start,
      pieceCatalog,
      move: {
        fromRow: 5,
        fromCol: 3,
        toRow: 6,
        toCol: 4,
        pieceCode: 'piece_gacha_en',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: null,
      },
    });

    const en = (
      committed.position.boardState.pieces as { char: string; row: number; col: number }[]
    ).find((p) => p.char === '閹');
    expect(en).toMatchObject({ row: 6, col: 4 });
  });
});
