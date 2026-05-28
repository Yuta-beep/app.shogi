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
    char: '逸',
    name: '逸',
    unlock: '',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [],
    isRepeatable: false,
    pieceCode: 'piece_gacha_itsu',
    skillDefinitionsV2: skillDefinitionsV2ForGachaChar('逸'),
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

describe('逸 敵駒を手駒へ', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('moves on forward and rear diagonals only', () => {
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
            pieceCode: 'piece_gacha_itsu',
            char: '逸',
            promoted: false,
          },
          { side: 'player', row: 8, col: 0, pieceCode: 'OU', char: '王', promoted: false },
        ],
        skill_definitions_v2: skillDefinitionsV2ForGachaChar('逸'),
      },
      hands: { player: {}, enemy: {} },
    };
    const legal = generateLegalMoves({ position, pieceCatalog });
    const fromItsu = legal.legalMoves.filter((m) => m.fromRow === 5 && m.fromCol === 4);
    expect(fromItsu.map((m) => `${m.toRow}:${m.toCol}`).sort()).toEqual(
      ['4:3', '4:5', '6:3', '6:5'].sort(),
    );
  });

  it('sends a random enemy piece to enemy hand when proc succeeds', () => {
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
          { side: 'enemy', row: 2, col: 2, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'enemy', row: 2, col: 6, pieceCode: 'KI', char: '金', promoted: false },
          {
            side: 'player',
            row: 5,
            col: 4,
            pieceCode: 'piece_gacha_itsu',
            char: '逸',
            promoted: false,
          },
          { side: 'player', row: 8, col: 0, pieceCode: 'OU', char: '王', promoted: false },
        ],
        skill_definitions_v2: skillDefinitionsV2ForGachaChar('逸'),
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
        toCol: 3,
        pieceCode: 'piece_gacha_itsu',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: null,
      },
    });

    const enemyOnBoard = (
      committed.position.boardState.pieces as { side: string; char: string }[]
    ).filter((p) => p.side === 'enemy' && p.char !== '王');
    expect(enemyOnBoard).toHaveLength(1);
    const enemyHands = committed.position.hands.enemy as Record<string, number>;
    const handTotal = Object.values(enemyHands).reduce((sum, n) => sum + Number(n ?? 0), 0);
    expect(handTotal).toBe(1);
    expect(
      (committed.position.boardState.pieces as { side: string; row: number; col: number }[]).some(
        (p) => p.side === 'enemy' && p.row === 0 && p.col === 4,
      ),
    ).toBe(true);
  });

  it('never selects enemy king', () => {
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
            side: 'player',
            row: 5,
            col: 4,
            pieceCode: 'piece_gacha_itsu',
            char: '逸',
            promoted: false,
          },
          { side: 'player', row: 8, col: 0, pieceCode: 'OU', char: '王', promoted: false },
        ],
        skill_definitions_v2: skillDefinitionsV2ForGachaChar('逸'),
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
        toCol: 3,
        pieceCode: 'piece_gacha_itsu',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: null,
      },
    });

    expect(
      (committed.position.boardState.pieces as { side: string; row: number; col: number }[]).some(
        (p) => p.side === 'enemy' && p.row === 0 && p.col === 4,
      ),
    ).toBe(true);
    const enemyHands = committed.position.hands.enemy as Record<string, number>;
    expect(Object.values(enemyHands).reduce((s, n) => s + Number(n ?? 0), 0)).toBe(0);
  });

  it('does not send when proc fails', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.9);

    const start: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: 'seed',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'enemy', row: 2, col: 2, pieceCode: 'FU', char: '歩', promoted: false },
          {
            side: 'player',
            row: 5,
            col: 4,
            pieceCode: 'piece_gacha_itsu',
            char: '逸',
            promoted: false,
          },
          { side: 'player', row: 8, col: 0, pieceCode: 'OU', char: '王', promoted: false },
        ],
        skill_definitions_v2: skillDefinitionsV2ForGachaChar('逸'),
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
        toCol: 3,
        pieceCode: 'piece_gacha_itsu',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: null,
      },
    });

    expect(
      (committed.position.boardState.pieces as { side: string; char: string }[]).filter(
        (p) => p.side === 'enemy' && p.char === '歩',
      ),
    ).toHaveLength(1);
    const enemyHands = committed.position.hands.enemy as Record<string, number>;
    expect(Object.values(enemyHands).reduce((s, n) => s + Number(n ?? 0), 0)).toBe(0);
  });
});
