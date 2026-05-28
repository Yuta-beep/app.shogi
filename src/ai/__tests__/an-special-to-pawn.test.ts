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
    char: '安',
    name: '安',
    unlock: '',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [],
    isRepeatable: false,
    pieceCode: 'piece_gacha_an',
    skillDefinitionsV2: skillDefinitionsV2ForGachaChar('安'),
  },
  {
    char: '麒',
    name: '麒',
    unlock: '',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [
      { dx: -1, dy: 0, maxStep: 9 },
      { dx: 1, dy: 0, maxStep: 9 },
      { dx: 0, dy: -1, maxStep: 9 },
      { dx: 0, dy: 1, maxStep: 9 },
      { dx: -1, dy: -1, maxStep: 1 },
      { dx: 1, dy: -1, maxStep: 1 },
      { dx: -1, dy: 1, maxStep: 1 },
      { dx: 1, dy: 1, maxStep: 1 },
    ],
    isRepeatable: false,
    pieceCode: 'piece_shop_kirin',
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

describe('安 特殊駒→歩', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('moves orthogonally 1 step and knight jump', () => {
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
            pieceCode: 'piece_gacha_an',
            char: '安',
            promoted: false,
          },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
        skill_definitions_v2: skillDefinitionsV2ForGachaChar('安'),
      },
      hands: { player: {}, enemy: {} },
    };
    const legal = generateLegalMoves({ position, pieceCatalog });
    const fromAn = legal.legalMoves.filter((m) => m.fromRow === 5 && m.fromCol === 4);
    expect(fromAn.map((m) => `${m.toRow}:${m.toCol}`).sort()).toEqual(
      ['3:3', '3:5', '4:4', '5:3', '5:5', '6:4'].sort(),
    );
  });

  it('on proc transforms one enemy special piece into pawn', () => {
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
          {
            side: 'enemy',
            row: 2,
            col: 2,
            pieceCode: 'piece_shop_kirin',
            char: '麒',
            promoted: false,
          },
          { side: 'enemy', row: 2, col: 6, pieceCode: 'FU', char: '歩', promoted: false },
          {
            side: 'player',
            row: 5,
            col: 4,
            pieceCode: 'piece_gacha_an',
            char: '安',
            promoted: false,
          },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
        skill_definitions_v2: skillDefinitionsV2ForGachaChar('安'),
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
        pieceCode: 'piece_gacha_an',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: null,
      },
    });

    const pieces = committed.position.boardState.pieces as {
      side: 'player' | 'enemy';
      row: number;
      col: number;
      pieceCode: string;
      char: string;
    }[];
    const kirin = pieces.find((p) => p.side === 'enemy' && p.row === 2 && p.col === 2);
    const pawn = pieces.find((p) => p.side === 'enemy' && p.row === 2 && p.col === 6);
    expect(kirin?.pieceCode).toBe('FU');
    expect(kirin?.char).toBe('歩');
    expect(pawn?.pieceCode).toBe('FU');
    expect(pawn?.char).toBe('歩');

    const skillState = (
      committed.position.boardState as {
        skill_state?: { piece_statuses?: Record<string, unknown>[] };
      }
    ).skill_state;
    expect(
      (skillState?.piece_statuses ?? []).some(
        (s) => s.status_type === 'an_transform' && s.side === 'enemy' && s.row === 2 && s.col === 2,
      ),
    ).toBe(true);
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
          {
            side: 'enemy',
            row: 2,
            col: 2,
            pieceCode: 'piece_shop_kirin',
            char: '麒',
            promoted: false,
          },
          {
            side: 'player',
            row: 5,
            col: 4,
            pieceCode: 'piece_gacha_an',
            char: '安',
            promoted: false,
          },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
        skill_definitions_v2: skillDefinitionsV2ForGachaChar('安'),
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
        pieceCode: 'piece_gacha_an',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: null,
      },
    });

    const kirin = (
      committed.position.boardState.pieces as { row: number; col: number; char: string }[]
    ).find((p) => p.row === 2 && p.col === 2);
    expect(kirin?.char).toBe('麒');
  });
});
