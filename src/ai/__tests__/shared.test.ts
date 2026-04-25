import {
  buildStateHash,
  createPosition,
  moveEquals,
  notationForMove,
  pieceChar,
} from '@/ai/engine/shared';
import type { AiBattleMove, AiBoardPiece, AiHandsState, AiPieceDefinition } from '@/ai/model';

const pieceCatalog: AiPieceDefinition[] = [
  {
    pieceCode: 'OU',
    canonicalCode: 'OU',
    sfenCode: 'K',
    char: '王',
    name: '王',
    unlock: 'default',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [{ dx: 0, dy: -1, maxStep: 1 }],
    isRepeatable: true,
  },
  {
    pieceCode: 'FU',
    canonicalCode: 'FU',
    sfenCode: 'P',
    char: '歩',
    name: '歩',
    unlock: 'default',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [{ dx: 0, dy: -1, maxStep: 1 }],
    isRepeatable: true,
  },
];

describe('ai engine shared', () => {
  it('compares moves and builds notation', () => {
    const lhs: AiBattleMove = {
      fromRow: 7,
      fromCol: 4,
      toRow: 6,
      toCol: 4,
      pieceCode: 'FU',
      promote: false,
      dropPieceCode: null,
      capturedPieceCode: null,
      notation: null,
    };
    const rhs: AiBattleMove = { ...lhs, pieceCode: 'fu' };

    expect(moveEquals(lhs, rhs)).toBe(true);
    expect(notationForMove(lhs)).toBe('7464');
    expect(notationForMove({ ...lhs, fromRow: null, fromCol: null, dropPieceCode: 'FU' })).toBe(
      'FU*64',
    );
  });

  it('creates stable state hashes and sfen', () => {
    const pieces: AiBoardPiece[] = [
      { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王' },
      { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王' },
      { side: 'player', row: 7, col: 4, pieceCode: 'FU', char: '歩' },
    ];
    const hands: AiHandsState = { player: { FU: 1 }, enemy: {} };

    const position = createPosition({
      pieces,
      hands,
      sideToMove: 'player',
      moveCount: 0,
      pieceCatalog,
    });

    expect(position.sfen).toContain(' b ');
    expect(buildStateHash(position)).toBe(position.stateHash);
    expect(pieceChar('FU', true)).toBe('と');
  });
});
