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
    char: '爆',
    name: '爆',
    unlock: '',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [],
    isRepeatable: false,
    pieceCode: 'piece_gacha_baku',
    skillDefinitionsV2: skillDefinitionsV2ForGachaChar('爆'),
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

describe('爆 爆発', () => {
  it('moves like gold (6 directions, 1 step)', () => {
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
            pieceCode: 'piece_gacha_baku',
            char: '爆',
            promoted: false,
          },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
        skill_definitions_v2: skillDefinitionsV2ForGachaChar('爆'),
      },
      hands: { player: {}, enemy: {} },
    };
    const legal = generateLegalMoves({ position, pieceCatalog });
    const fromBaku = legal.legalMoves.filter((m) => m.fromRow === 5 && m.fromCol === 4);
    expect(fromBaku.map((m) => `${m.toRow}:${m.toCol}`).sort()).toEqual(
      ['4:3', '4:4', '4:5', '5:3', '5:5', '6:4'].sort(),
    );
  });

  it('pushes adjacent enemy and ally pieces outward', () => {
    const start: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: 'seed',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'enemy', row: 3, col: 3, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'player', row: 4, col: 5, pieceCode: 'FU', char: '歩', promoted: false },
          {
            side: 'player',
            row: 5,
            col: 4,
            pieceCode: 'piece_gacha_baku',
            char: '爆',
            promoted: false,
          },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
        skill_definitions_v2: skillDefinitionsV2ForGachaChar('爆'),
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
        pieceCode: 'piece_gacha_baku',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: null,
      },
    });

    const pieces = committed.position.boardState.pieces as {
      side: string;
      row: number;
      col: number;
      char: string;
    }[];
    const enemyPawn = pieces.find((p) => p.side === 'enemy' && p.char === '歩');
    const allyPawn = pieces.find((p) => p.side === 'player' && p.char === '歩');
    expect(enemyPawn).toMatchObject({ side: 'enemy', row: 2, col: 2, char: '歩' });
    expect(allyPawn).toMatchObject({ side: 'player', row: 4, col: 6, char: '歩' });
  });

  it('does not push when push destination is occupied', () => {
    const start: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: 'seed',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'enemy', row: 3, col: 3, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'enemy', row: 2, col: 2, pieceCode: 'FU', char: '歩', promoted: false },
          {
            side: 'player',
            row: 5,
            col: 4,
            pieceCode: 'piece_gacha_baku',
            char: '爆',
            promoted: false,
          },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
        skill_definitions_v2: skillDefinitionsV2ForGachaChar('爆'),
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
        pieceCode: 'piece_gacha_baku',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: null,
      },
    });

    const blocked = (
      committed.position.boardState.pieces as { side: string; row: number; col: number }[]
    ).find((p) => p.side === 'enemy' && p.row === 3 && p.col === 3);
    expect(blocked).toBeDefined();
  });
});
