import { assertMoveAllowedBySessionCatalog } from '@/ai/engine/guardrails';
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
];

function positionForPlayerItsu(): AiBattlePosition {
  return {
    sideToMove: 'player',
    turnNumber: 1,
    moveCount: 0,
    sfen: 'seed',
    stateHash: 'itsu-guardrail-seed',
    boardState: {
      pieces: [
        { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        { side: 'player', row: 4, col: 4, pieceCode: 'piece_gacha_itsu', char: '逸', promoted: false },
        { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
      ],
      skill_definitions_v2: skillDefinitionsV2ForGachaChar('逸'),
    },
    hands: { player: {}, enemy: {} },
  };
}

describe('逸 guardrail', () => {
  it('legal moves use GACHA_ITSU as pieceCode', () => {
    const position = positionForPlayerItsu();
    const legal = generateLegalMoves({ position, pieceCatalog });
    const fromItsu = legal.legalMoves.filter((m) => m.fromRow === 4 && m.fromCol === 4);
    expect(fromItsu.length).toBeGreaterThan(0);
    expect(fromItsu.every((m) => m.pieceCode === 'GACHA_ITSU')).toBe(true);
  });

  it('accepts opaque instance pieceCode from the client', () => {
    const position = positionForPlayerItsu();
    const legal = generateLegalMoves({ position, pieceCatalog });
    const itsuMove = legal.legalMoves.find((m) => m.fromRow === 4 && m.fromCol === 4 && m.toRow === 3);
    expect(itsuMove).toBeDefined();

    expect(() =>
      assertMoveAllowedBySessionCatalog({
        position,
        pieceCatalog,
        actor: 'player',
        move: {
          ...itsuMove!,
          pieceCode: 'piece_gacha_itsu',
        },
      }),
    ).not.toThrow();
  });

  it('accepts 1-based coordinates when the board cell is 0-based', () => {
    const position = positionForPlayerItsu();
    const legal = generateLegalMoves({ position, pieceCatalog });
    const itsuMove = legal.legalMoves.find((m) => m.fromRow === 4 && m.fromCol === 4 && m.toRow === 3);
    expect(itsuMove).toBeDefined();

    expect(() =>
      assertMoveAllowedBySessionCatalog({
        position,
        pieceCatalog,
        actor: 'player',
        move: {
          ...itsuMove!,
          fromRow: 5,
          fromCol: 5,
          toRow: 4,
          toCol: 4,
          pieceCode: 'piece_gacha_itsu',
        },
      }),
    ).not.toThrow();
  });
});
