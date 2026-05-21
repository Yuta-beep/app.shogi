import { applyMove } from '@/ai/engine/apply-move';
import { generateLegalMoves } from '@/ai/engine/legal-moves';
import { skillDefinitionsV2ForGachaChar } from '@/ai/engine/gacha-piece-skill-definitions';
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
    char: '逃',
    name: '逃',
    unlock: '',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [],
    isRepeatable: false,
    pieceCode: 'piece_gacha_tou2',
    skillDefinitionsV2: skillDefinitionsV2ForGachaChar('逃'),
  },
];

describe('逃 王追従', () => {
  it('moves one step in all eight directions', () => {
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
            pieceCode: 'piece_gacha_tou2',
            char: '逃',
            promoted: false,
          },
          { side: 'player', row: 8, col: 0, pieceCode: 'OU', char: '王', promoted: false },
        ],
        skill_definitions_v2: skillDefinitionsV2ForGachaChar('逃'),
      },
      hands: { player: {}, enemy: {} },
    };
    const legal = generateLegalMoves({ position, pieceCatalog });
    const fromNige = legal.legalMoves.filter((m) => m.fromRow === 4 && m.fromCol === 4);
    expect(fromNige.map((m) => `${m.toRow}:${m.toCol}`).sort()).toEqual(
      [
        '3:3',
        '3:4',
        '3:5',
        '4:3',
        '4:5',
        '5:3',
        '5:4',
        '5:5',
      ].sort(),
    );
  });

  it('moves ally king one step in the same direction when the cell is empty', () => {
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
            col: 4,
            pieceCode: 'piece_gacha_tou2',
            char: '逃',
            promoted: false,
          },
          { side: 'player', row: 7, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
        skill_definitions_v2: skillDefinitionsV2ForGachaChar('逃'),
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
        pieceCode: 'piece_gacha_tou2',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: null,
      },
    });

    const playerKing = (
      committed.position.boardState.pieces as {
        side: string;
        char: string;
        row: number;
        col: number;
      }[]
    ).find((p) => p.side === 'player' && p.char === '王');
    expect(playerKing).toMatchObject({ row: 6, col: 4 });
    const nige = (
      committed.position.boardState.pieces as { char: string; row: number; col: number }[]
    ).find((p) => p.char === '逃');
    expect(nige).toMatchObject({ row: 4, col: 4 });
  });

  it('does not move ally king when the follow cell is occupied', () => {
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
            col: 4,
            pieceCode: 'piece_gacha_tou2',
            char: '逃',
            promoted: false,
          },
          { side: 'player', row: 6, col: 4, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'player', row: 7, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
        skill_definitions_v2: skillDefinitionsV2ForGachaChar('逃'),
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
        pieceCode: 'piece_gacha_tou2',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: null,
      },
    });

    const playerKing = (
      committed.position.boardState.pieces as {
        side: string;
        char: string;
        row: number;
        col: number;
      }[]
    ).find((p) => p.side === 'player' && p.char === '王');
    expect(playerKing).toMatchObject({ row: 7, col: 4 });
  });
});
