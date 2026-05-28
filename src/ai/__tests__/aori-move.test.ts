import { generateLegalMoves } from '@/ai/engine/legal-moves';
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
    char: '煽',
    name: '煽',
    unlock: '',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [],
    isRepeatable: false,
    pieceCode: 'piece_gacha_aori',
  },
];

describe('煽 移動', () => {
  it('slides orthogonally any distance', () => {
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
            pieceCode: 'piece_gacha_aori',
            char: '煽',
            promoted: false,
          },
          { side: 'player', row: 8, col: 0, pieceCode: 'OU', char: '王', promoted: false },
        ],
      },
      hands: { player: {}, enemy: {} },
    };
    const legal = generateLegalMoves({ position, pieceCatalog });
    const fromAori = legal.legalMoves.filter((m) => m.fromRow === 5 && m.fromCol === 4);
    const targets = fromAori.map((m) => `${m.toRow}:${m.toCol}`).sort();
    expect(targets).toContain('0:4');
    expect(targets).toContain('7:4');
    expect(targets).toContain('5:0');
    expect(targets).toContain('5:8');
    expect(targets).not.toContain('4:3');
  });
});
