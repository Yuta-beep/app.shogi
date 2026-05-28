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
    char: '灯',
    name: '灯',
    unlock: '',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [],
    isRepeatable: false,
    pieceCode: 'piece_gacha_tou',
    skillDefinitionsV2: skillDefinitionsV2ForGachaChar('灯'),
  },
];

describe('灯 味方歩→火', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('moves forward/back/sides and rear diagonals 1 step', () => {
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
            pieceCode: 'piece_gacha_tou',
            char: '灯',
            promoted: false,
          },
          { side: 'player', row: 8, col: 0, pieceCode: 'OU', char: '王', promoted: false },
        ],
        skill_definitions_v2: skillDefinitionsV2ForGachaChar('灯'),
      },
      hands: { player: {}, enemy: {} },
    };
    const legal = generateLegalMoves({ position, pieceCatalog });
    const fromTou = legal.legalMoves.filter((m) => m.fromRow === 5 && m.fromCol === 4);
    const targets = fromTou.map((m) => `${m.toRow}:${m.toCol}`).sort();
    expect(targets).toEqual(['4:4', '5:3', '5:5', '6:3', '6:4', '6:5'].sort());
    expect(targets).not.toContain('4:3');
  });

  it('transforms one random ally pawn to fire on proc', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);

    const start: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: 'seed',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'player', row: 6, col: 3, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'player', row: 6, col: 5, pieceCode: 'FU', char: '歩', promoted: false },
          {
            side: 'player',
            row: 5,
            col: 4,
            pieceCode: 'piece_gacha_tou',
            char: '灯',
            promoted: false,
          },
          { side: 'player', row: 8, col: 0, pieceCode: 'OU', char: '王', promoted: false },
        ],
        skill_definitions_v2: skillDefinitionsV2ForGachaChar('灯'),
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
        pieceCode: 'piece_gacha_tou',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: null,
      },
    });

    const pawns = (
      committed.position.boardState.pieces as {
        side: string;
        char: string;
        pieceCode: string;
      }[]
    ).filter((p) => p.side === 'player' && (p.char === '歩' || p.pieceCode === 'FU'));
    const fires = (
      committed.position.boardState.pieces as { side: string; char: string; pieceCode: string }[]
    ).filter((p) => p.side === 'player' && p.char === '火');
    expect(pawns).toHaveLength(1);
    expect(fires).toHaveLength(1);
    expect(fires[0]?.pieceCode).toBe('FIR');
  });

  it('does not transform when proc fails', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.95);

    const start: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: 'seed',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'player', row: 6, col: 4, pieceCode: 'FU', char: '歩', promoted: false },
          {
            side: 'player',
            row: 5,
            col: 4,
            pieceCode: 'piece_gacha_tou',
            char: '灯',
            promoted: false,
          },
          { side: 'player', row: 8, col: 0, pieceCode: 'OU', char: '王', promoted: false },
        ],
        skill_definitions_v2: skillDefinitionsV2ForGachaChar('灯'),
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
        pieceCode: 'piece_gacha_tou',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: null,
      },
    });

    const pawn = (committed.position.boardState.pieces as { char: string }[]).find(
      (p) => p.char === '歩',
    );
    expect(pawn).toBeDefined();
    expect(
      (committed.position.boardState.pieces as { char: string }[]).some((p) => p.char === '火'),
    ).toBe(false);
  });
});
