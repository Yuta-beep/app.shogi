import { generateLegalMoves } from '@/ai/engine/legal-moves';
import { createSkillRuntimeView } from '@/ai/engine/skill-runtime';
import { skillDefinitionsV2ForGachaChar } from '@/ai/engine/gacha-piece-skill-definitions';
import type { AiBattlePosition } from '@/ai/model';

const pieceCatalog = [
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
    char: '室',
    name: '室',
    unlock: '',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [],
    isRepeatable: false,
    pieceCode: 'piece_gacha_shitsu',
    skillDefinitionsV2: skillDefinitionsV2ForGachaChar('室'),
  },
];

function basePosition(skillDefs?: Record<string, unknown>): AiBattlePosition {
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
          col: 3,
          pieceCode: 'piece_gacha_shitsu',
          char: '室',
          promoted: false,
        },
        { side: 'player', row: 7, col: 4, pieceCode: 'OU', char: '王', promoted: false },
      ],
      skill_definitions_v2: skillDefs ?? skillDefinitionsV2ForGachaChar('室'),
    },
    hands: { player: {}, enemy: {} },
  };
}

describe('室 セーフルーム', () => {
  it('moves like gold (6 directions, 1 step)', () => {
    const legal = generateLegalMoves({ position: basePosition(), pieceCatalog });
    const fromShitsu = legal.legalMoves.filter((m) => m.fromRow === 5 && m.fromCol === 3);
    const targets = fromShitsu.map((m) => `${m.toRow}:${m.toCol}`).sort();
    expect(targets).toEqual(['4:2', '4:3', '4:4', '5:2', '5:4', '6:3'].sort());
  });

  it('king on safe_room cell cannot move and has capture immunity', () => {
    const position: AiBattlePosition = {
      ...basePosition(),
      boardState: {
        pieces: [
          { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          {
            side: 'player',
            row: 5,
            col: 3,
            pieceCode: 'piece_gacha_shitsu',
            char: '室',
            promoted: false,
          },
          { side: 'player', row: 7, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
        skill_state: {
          board_hazards: [
            {
              row: 7,
              col: 4,
              hazard_type: 'safe_room_cell',
              affects_side: 'player',
              remaining_turns: 2,
            },
          ],
        },
        skill_definitions_v2: skillDefinitionsV2ForGachaChar('室'),
      },
    };

    const view = createSkillRuntimeView(position);
    expect(view.immobilizedCells.has('player:7:4')).toBe(true);
    expect(view.captureImmunityCells.has('player:7:4')).toBe(true);

    const kingMoves = generateLegalMoves({ position, pieceCatalog }).legalMoves.filter(
      (m) => m.fromRow === 7 && m.fromCol === 4,
    );
    expect(kingMoves.length).toBe(0);
  });

  it('enemy cannot capture king on safe_room cell', () => {
    const position: AiBattlePosition = {
      ...basePosition(),
      sideToMove: 'enemy',
      boardState: {
        pieces: [
          { side: 'enemy', row: 2, col: 4, pieceCode: 'FU', char: '歩', promoted: false },
          { side: 'player', row: 7, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
        skill_state: {
          board_hazards: [
            {
              row: 7,
              col: 4,
              hazard_type: 'safe_room_cell',
              affects_side: 'player',
              remaining_turns: 2,
            },
          ],
        },
      },
    };
    const legal = generateLegalMoves({ position, pieceCatalog });
    const capturesKing = legal.legalMoves.some((m) => m.toRow === 7 && m.toCol === 4);
    expect(capturesKing).toBe(false);
  });
});
