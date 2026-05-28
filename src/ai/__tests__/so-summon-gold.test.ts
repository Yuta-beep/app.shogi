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
    char: '宋',
    name: '宋',
    unlock: '',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [],
    isRepeatable: false,
    pieceCode: 'piece_gacha_so',
    skillDefinitionsV2: skillDefinitionsV2ForGachaChar('宋'),
  },
];

describe('宋 金召喚', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('slides forward/back and steps sideways 1', () => {
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
            pieceCode: 'piece_gacha_so',
            char: '宋',
            promoted: false,
          },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
        skill_definitions_v2: skillDefinitionsV2ForGachaChar('宋'),
      },
      hands: { player: {}, enemy: {} },
    };
    const legal = generateLegalMoves({ position, pieceCatalog });
    const fromSo = legal.legalMoves.filter((m) => m.fromRow === 5 && m.fromCol === 4);
    const targets = fromSo.map((m) => `${m.toRow}:${m.toCol}`).sort();
    expect(targets).toContain('0:4');
    expect(targets).toContain('5:3');
    expect(targets).toContain('5:5');
    expect(targets).not.toContain('5:6');
  });

  it('summons gold on random adjacent empty cell when proc succeeds', () => {
    jest.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0);

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
            pieceCode: 'piece_gacha_so',
            char: '宋',
            promoted: false,
          },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
        skill_definitions_v2: skillDefinitionsV2ForGachaChar('宋'),
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
        pieceCode: 'piece_gacha_so',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: null,
      },
    });

    const gold = (
      committed.position.boardState.pieces as {
        side: string;
        char: string;
        pieceCode: string;
        row: number;
        col: number;
      }[]
    ).filter((p) => p.side === 'player' && p.char === '金');
    expect(gold).toHaveLength(1);
    expect(gold[0]?.pieceCode).toBe('KI');
    const { row, col } = gold[0]!;
    expect(Math.abs(row - 4) <= 1 && Math.abs(col - 4) <= 1).toBe(true);
    expect(row !== 4 || col !== 4).toBe(true);
  });

  it('does not summon when proc fails', () => {
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
          {
            side: 'player',
            row: 5,
            col: 4,
            pieceCode: 'piece_gacha_so',
            char: '宋',
            promoted: false,
          },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
        skill_definitions_v2: skillDefinitionsV2ForGachaChar('宋'),
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
        pieceCode: 'piece_gacha_so',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: null,
      },
    });

    const goldCount = (
      committed.position.boardState.pieces as { char: string; side: string }[]
    ).filter((p) => p.side === 'player' && p.char === '金').length;
    expect(goldCount).toBe(0);
  });
});
