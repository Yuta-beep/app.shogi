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

function positionWithTouBesideNige(): AiBattlePosition {
  return {
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
          pieceCode: 'piece_gacha_tou',
          char: '灯',
          promoted: false,
        },
        {
          side: 'player',
          row: 5,
          col: 5,
          pieceCode: 'piece_gacha_tou2',
          char: '逃',
          promoted: false,
        },
        { side: 'player', row: 8, col: 0, pieceCode: 'OU', char: '王', promoted: false },
      ],
      skill_definitions_v2: {
        ...skillDefinitionsV2ForGachaChar('灯'),
        ...skillDefinitionsV2ForGachaChar('逃'),
      },
    },
    hands: { player: {}, enemy: {} },
  };
}

describe('灯 adjacent to 逃', () => {
  it('灯 can still move when 逃 is on an adjacent cell', () => {
    const legal = generateLegalMoves({
      position: positionWithTouBesideNige(),
      pieceCatalog,
    });
    const fromTou = legal.legalMoves.filter((m) => m.fromRow === 5 && m.fromCol === 4);
    expect(fromTou.length).toBeGreaterThan(0);
    expect(fromTou.map((m) => `${m.toRow}:${m.toCol}`).sort()).toEqual(
      ['4:4', '5:3', '6:3', '6:4', '6:5'].sort(),
    );
  });
});
