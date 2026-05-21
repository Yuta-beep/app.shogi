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
    char: '膠',
    name: '膠',
    unlock: '',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [],
    isRepeatable: false,
    pieceCode: 'piece_gacha_kou',
  },
  {
    char: '定',
    name: '定',
    unlock: '',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [],
    isRepeatable: false,
    pieceCode: 'piece_gacha_sadame',
  },
];

describe('膠 横移動追従', () => {
  it('moves on forward diagonals and straight back', () => {
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
            col: 4,
            pieceCode: 'piece_gacha_kou',
            char: '膠',
            promoted: false,
          },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
      },
      hands: { player: {}, enemy: {} },
    };
    const legal = generateLegalMoves({ position, pieceCatalog });
    const fromKo = legal.legalMoves.filter((m) => m.fromRow === 5 && m.fromCol === 4);
    expect(fromKo.map((m) => `${m.toRow}:${m.toCol}`).sort()).toEqual(
      ['4:3', '4:5', '6:4'].sort(),
    );
  });

  it('follows when adjacent ally moves horizontally', () => {
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
            pieceCode: 'piece_gacha_kou',
            char: '膠',
            promoted: false,
          },
          {
            side: 'player',
            row: 5,
            col: 4,
            pieceCode: 'piece_gacha_sadame',
            char: '定',
            promoted: false,
          },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
      },
      hands: { player: {}, enemy: {} },
    };

    const committed = applyMove({
      position: start,
      pieceCatalog,
      move: {
        fromRow: 5,
        fromCol: 4,
        toRow: 5,
        toCol: 5,
        pieceCode: 'piece_gacha_sadame',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: null,
      },
    });

    const ko = (
      committed.position.boardState.pieces as { char: string; row: number; col: number }[]
    ).find((p) => p.char === '膠');
    expect(ko).toMatchObject({ row: 5, col: 4 });
  });

  it('does not follow on vertical ally moves', () => {
    const start: AiBattlePosition = {
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
            pieceCode: 'piece_gacha_kou',
            char: '膠',
            promoted: false,
          },
          {
            side: 'player',
            row: 5,
            col: 4,
            pieceCode: 'piece_gacha_sadame',
            char: '定',
            promoted: false,
          },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
      },
      hands: { player: {}, enemy: {} },
    };

    const committed = applyMove({
      position: start,
      pieceCatalog,
      move: {
        fromRow: 5,
        fromCol: 4,
        toRow: 4,
        toCol: 4,
        pieceCode: 'piece_gacha_sadame',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: null,
      },
    });

    const ko = (
      committed.position.boardState.pieces as { char: string; row: number; col: number }[]
    ).find((p) => p.char === '膠');
    expect(ko).toMatchObject({ row: 5, col: 3 });
  });
});
