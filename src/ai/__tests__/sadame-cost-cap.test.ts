import { applyMove } from '@/ai/engine/apply-move';
import { generateLegalMoves } from '@/ai/engine/legal-moves';
import { skillDefinitionsV2ForGachaChar } from '@/ai/engine/gacha-piece-skill-definitions';
import { activeOpponentTurnMaxPieceCostCap } from '@/ai/engine/skill-runtime';
import { KIRIN_MOVE_VECTORS } from '@/ai/engine/shop-piece-moves';
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
    char: '定',
    name: '定',
    unlock: '',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [],
    isRepeatable: false,
    pieceCode: 'piece_gacha_sadame',
    skillDefinitionsV2: skillDefinitionsV2ForGachaChar('定'),
  },
  {
    char: '麒',
    name: '麒',
    unlock: '',
    desc: '',
    skill: '',
    move: '',
    moveVectors: KIRIN_MOVE_VECTORS,
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

describe('定 コスト上限スキル', () => {
  it('moves orthogonally 1 step', () => {
    const position: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: 'seed',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'player', row: 5, col: 4, pieceCode: 'piece_gacha_sadame', char: '定', promoted: false },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
        skill_definitions_v2: skillDefinitionsV2ForGachaChar('定'),
      },
      hands: { player: {}, enemy: {} },
    };
    const legal = generateLegalMoves({ position, pieceCatalog });
    const fromSadame = legal.legalMoves.filter((m) => m.fromRow === 5 && m.fromCol === 4);
    expect(fromSadame.map((m) => `${m.toRow}:${m.toCol}`).sort()).toEqual(
      ['4:4', '5:3', '5:5', '6:4'].sort(),
    );
  });

  it('applies opponent cost cap after 定 moves', () => {
    const start: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: 'seed',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'player', row: 5, col: 4, pieceCode: 'piece_gacha_sadame', char: '定', promoted: false },
          { side: 'enemy', row: 2, col: 2, pieceCode: 'piece_shop_kirin', char: '麒', promoted: false },
          { side: 'enemy', row: 2, col: 6, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
        skill_definitions_v2: skillDefinitionsV2ForGachaChar('定'),
      },
      hands: { player: {}, enemy: {} },
    };

    const afterSadame = applyMove({
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

    expect(afterSadame.position.sideToMove).toBe('enemy');
    expect(activeOpponentTurnMaxPieceCostCap(afterSadame.position, 'enemy')).toBe(5);

    const enemyLegal = generateLegalMoves({ position: afterSadame.position, pieceCatalog });
    expect(enemyLegal.legalMoves.some((m) => m.fromRow === 2 && m.fromCol === 6)).toBe(true);
    expect(enemyLegal.legalMoves.some((m) => m.fromRow === 2 && m.fromCol === 2)).toBe(false);
  });

  it('clears cost cap after opponent completes a turn', () => {
    const position: AiBattlePosition = {
      sideToMove: 'enemy',
      turnNumber: 2,
      moveCount: 1,
      sfen: 'seed',
      stateHash: 'seed',
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          { side: 'enemy', row: 2, col: 2, pieceCode: 'piece_shop_kirin', char: '麒', promoted: false },
          { side: 'enemy', row: 2, col: 6, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'player', row: 4, col: 4, pieceCode: 'piece_gacha_sadame', char: '定', promoted: false },
          { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
        skill_state: {
          piece_statuses: [
            {
              side: 'player',
              row: 4,
              col: 4,
              status_type: 'opponent_turn_max_piece_cost',
              max_piece_cost: 5,
              remaining_turns: 1,
            },
          ],
        },
      },
      hands: { player: {}, enemy: {} },
    };

    const afterEnemy = applyMove({
      position,
      pieceCatalog,
      move: {
        fromRow: 2,
        fromCol: 6,
        toRow: 3,
        toCol: 6,
        pieceCode: 'FU',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: null,
      },
    });

    expect(activeOpponentTurnMaxPieceCostCap(afterEnemy.position, 'player')).toBeNull();

    const nextEnemyTurn: AiBattlePosition = {
      ...afterEnemy.position,
      sideToMove: 'enemy',
    };
    expect(activeOpponentTurnMaxPieceCostCap(nextEnemyTurn, 'enemy')).toBeNull();
    const kirinCanMove = generateLegalMoves({
      position: nextEnemyTurn,
      pieceCatalog,
    }).legalMoves.some((m) => m.fromRow === 2 && m.fromCol === 2);
    expect(kirinCanMove).toBe(true);
  });
});
