import { applyMove } from '@/ai/engine/apply-move';
import { skillDefinitionsV2ForGachaChar } from '@/ai/engine/gacha-piece-skill-definitions';
import { henBoardEdgeCells } from '@/ai/engine/hen-board-edge';
import { generateLegalMoves } from '@/ai/engine/legal-moves';
import { normalizeBattlePosition, type AiBattlePosition, type AiPieceDefinition } from '@/ai/model';

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
    char: '辺',
    name: '辺',
    unlock: '',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [],
    isRepeatable: false,
    pieceCode: 'piece_gacha_hen',
    skillDefinitionsV2: skillDefinitionsV2ForGachaChar('辺'),
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

describe('辺 辺封印', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('moves one step forward and on forward/rear diagonals', () => {
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
            pieceCode: 'piece_gacha_hen',
            char: '辺',
            promoted: false,
          },
          { side: 'player', row: 8, col: 0, pieceCode: 'OU', char: '王', promoted: false },
        ],
        skill_definitions_v2: skillDefinitionsV2ForGachaChar('辺'),
      },
      hands: { player: {}, enemy: {} },
    };
    const legal = generateLegalMoves({ position, pieceCatalog });
    const fromHen = legal.legalMoves.filter((m) => m.fromRow === 5 && m.fromCol === 4);
    expect(fromHen.map((m) => `${m.toRow}:${m.toCol}`).sort()).toEqual(
      ['4:3', '4:4', '4:5', '6:3', '6:5'].sort(),
    );
  });

  it('stuns all pieces on a randomly selected edge for 2 turns', () => {
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
          { side: 'enemy', row: 0, col: 2, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'player', row: 0, col: 6, pieceCode: 'FU', char: '歩', promoted: false },
          {
            side: 'player',
            row: 5,
            col: 4,
            pieceCode: 'piece_gacha_hen',
            char: '辺',
            promoted: false,
          },
          { side: 'player', row: 8, col: 0, pieceCode: 'OU', char: '王', promoted: false },
        ],
        skill_definitions_v2: skillDefinitionsV2ForGachaChar('辺'),
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
        pieceCode: 'piece_gacha_hen',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: null,
      },
    });

    const skillState = (
      committed.position.boardState as {
        skill_state?: {
          board_hazards?: Record<string, unknown>[];
          piece_statuses?: Record<string, unknown>[];
        };
      }
    ).skill_state;
    const highlight = (skillState?.board_hazards ?? []).find(
      (h) => h.hazard_type === 'hen_edge_highlight',
    );
    expect(highlight?.edge).toBe('top');
    expect(highlight?.remaining_turns).toBe(2);

    const topCells = henBoardEdgeCells('top').map((c) => `${c.row}:${c.col}`);
    const stunnedOnTop = (skillState?.piece_statuses ?? []).filter(
      (s) =>
        s.status_type === 'stun' &&
        topCells.includes(`${s.row}:${s.col}`) &&
        (s.remaining_turns === 2 || s.remainingTurns === 2),
    );
    expect(stunnedOnTop.length).toBeGreaterThanOrEqual(3);

    const enemyOnTop = generateLegalMoves({
      position: normalizeBattlePosition({ ...committed.position, sideToMove: 'enemy' }),
      pieceCatalog,
    });
    expect(enemyOnTop.legalMoves.some((m) => m.fromRow === 0 && m.fromCol === 2)).toBe(false);
  });
});
