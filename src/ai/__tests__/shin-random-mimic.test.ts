import { ensureShinTurnMimicForBattle, generateLegalMoves } from '@/ai/engine/legal-moves';
import { readShinTurnMimic } from '@/ai/engine/shin-turn-mimic';
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
    char: '定',
    name: '定',
    unlock: '',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [],
    isRepeatable: false,
    pieceCode: 'piece_gacha_sadame',
  },
];

function positionWithShin(turnNumber = 1): AiBattlePosition {
  return {
    sideToMove: 'player',
    turnNumber,
    moveCount: 0,
    sfen: 'seed',
    stateHash: 'seed',
    boardState: {
      pieces: [
        {
          side: 'player',
          row: 5,
          col: 4,
          pieceCode: 'piece_gacha_shin',
          char: '進',
          promoted: false,
        },
        { side: 'player', row: 8, col: 0, pieceCode: 'OU', char: '王', promoted: false },
      ],
    },
    hands: { player: {}, enemy: {} },
  };
}

describe('進 毎ターンランダム模倣移動', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('mimics pawn forward step when pool rolls to 歩', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);

    const position = positionWithShin();
    ensureShinTurnMimicForBattle(position, pieceCatalog);
    const legal = generateLegalMoves({ position, pieceCatalog });
    const fromShin = legal.legalMoves.filter((m) => m.fromRow === 5 && m.fromCol === 4);
    expect(fromShin.map((m) => `${m.toRow}:${m.toCol}`).sort()).toEqual(['4:4']);

    const mimic = readShinTurnMimic(position, 'player');
    expect(mimic?.mimic_char).toBe('歩');
    expect(mimic?.bound_turn_number).toBe(1);
  });

  it('mimics 定 orthogonal steps when pool rolls to 定', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.99);

    const position = positionWithShin();
    ensureShinTurnMimicForBattle(position, pieceCatalog);
    const legal = generateLegalMoves({ position, pieceCatalog });
    const fromShin = legal.legalMoves.filter((m) => m.fromRow === 5 && m.fromCol === 4);
    expect(fromShin.map((m) => `${m.toRow}:${m.toCol}`).sort()).toEqual(
      ['4:4', '5:3', '5:5', '6:4'].sort(),
    );
  });

  it('reuses the same mimic entry within the same turn', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const position = positionWithShin();
    ensureShinTurnMimicForBattle(position, pieceCatalog);
    const first = readShinTurnMimic(position, 'player');
    generateLegalMoves({ position, pieceCatalog });
    generateLegalMoves({ position, pieceCatalog });
    const second = readShinTurnMimic(position, 'player');
    expect(second).toEqual(first);
    expect(Math.random).toHaveBeenCalledTimes(1);
  });
});
