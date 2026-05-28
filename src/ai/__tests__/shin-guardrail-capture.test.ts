import { applyMove } from '@/ai/engine/apply-move';
import { assertMoveAllowedBySessionCatalog } from '@/ai/engine/guardrails';
import { ensureShinTurnMimicForBattle, generateLegalMoves } from '@/ai/engine/legal-moves';
import { capturedToHandPieceCode } from '@/features/stage-shogi/domain/game-rules';
import type { AiBattlePosition, AiPieceDefinition } from '@/ai/model';

const pieceCatalog: AiPieceDefinition[] = [
  {
    char: '進',
    name: '進',
    unlock: '',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [],
    isRepeatable: false,
    pieceCode: 'piece_gacha_shin',
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
  {
    char: '王',
    name: '王',
    unlock: '',
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
    isRepeatable: false,
    pieceCode: 'OU',
  },
];

function positionForPlayerShinMove(): AiBattlePosition {
  return {
    sideToMove: 'player',
    turnNumber: 1,
    moveCount: 0,
    sfen: 'seed',
    stateHash: 'shin-guardrail-seed',
    boardState: {
      pieces: [
        { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        {
          side: 'player',
          row: 5,
          col: 4,
          pieceCode: 'piece_gacha_shin',
          char: '進',
          promoted: false,
        },
        { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
      ],
      skill_state: {
        shin_turn_mimics: [
          {
            side: 'player',
            bound_turn_number: 1,
            mimic_char: '歩',
            mimic_piece_code: 'FU',
          },
        ],
      },
    },
    hands: { player: {}, enemy: {} },
  };
}

function positionForEnemyCaptureShin(): AiBattlePosition {
  return {
    sideToMove: 'enemy',
    turnNumber: 2,
    moveCount: 1,
    sfen: 'seed',
    stateHash: 'shin-capture-seed',
    boardState: {
      pieces: [
        { side: 'enemy', row: 2, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        {
          side: 'player',
          row: 3,
          col: 4,
          pieceCode: 'piece_gacha_shin',
          char: '進',
          promoted: false,
        },
        { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
      ],
    },
    hands: { player: {}, enemy: {} },
  };
}

describe('進 guardrail and capture', () => {
  it('resolves captured 進 to GACHA_SHIN for in-hand display', () => {
    expect(
      capturedToHandPieceCode({
        side: 'player',
        row: 3,
        col: 4,
        pieceCode: 'piece_gacha_shin',
        char: '進',
        promoted: false,
      }),
    ).toBe('GACHA_SHIN');
  });

  it('accepts a shin move when pieceCode differs but coordinates match', () => {
    const position = positionForPlayerShinMove();
    ensureShinTurnMimicForBattle(position, pieceCatalog);
    const legal = generateLegalMoves({ position, pieceCatalog });
    const shinMove = legal.legalMoves.find(
      (m) => m.fromRow === 5 && m.fromCol === 4 && m.toRow === 4,
    );
    expect(shinMove).toBeDefined();

    expect(() =>
      assertMoveAllowedBySessionCatalog({
        position,
        pieceCatalog,
        actor: 'player',
        move: {
          ...shinMove!,
          pieceCode: 'FU',
        },
      }),
    ).not.toThrow();
  });

  it('adds captured 進 to the capturer hand', () => {
    const position = positionForEnemyCaptureShin();
    const committed = applyMove({
      position,
      pieceCatalog,
      move: {
        fromRow: 2,
        fromCol: 4,
        toRow: 3,
        toCol: 4,
        pieceCode: 'OU',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: 'GACHA_SHIN',
        notation: null,
      },
    });
    expect(committed.position.hands.enemy.GACHA_SHIN).toBe(1);
  });
});
