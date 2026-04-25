import { assertMoveAllowedBySessionCatalog } from '@/ai/engine/guardrails';
import type { AiBattlePosition } from '@/ai/model';
import type { PieceCatalogItem } from '@/usecases/piece-info/load-piece-catalog-usecase';

const pieceCatalog: PieceCatalogItem[] = [
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

function createPosition(): AiBattlePosition {
  return {
    sideToMove: 'enemy',
    turnNumber: 2,
    moveCount: 1,
    sfen: '9/4k4/9/9/9/9/9/4P4/4K4 w - 2',
    stateHash: 'seed',
    boardState: {
      pieces: [
        { side: 'enemy', row: 1, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        { side: 'player', row: 7, col: 4, pieceCode: 'FU', char: '歩', promoted: false },
        { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
      ],
    },
    hands: {
      player: {},
      enemy: {},
    },
  };
}

describe('ai guardrails', () => {
  it('accepts a move that is legal under the session piece catalog', () => {
    expect(() =>
      assertMoveAllowedBySessionCatalog({
        position: createPosition(),
        pieceCatalog,
        actor: 'enemy',
        move: {
          fromRow: 1,
          fromCol: 4,
          toRow: 2,
          toCol: 4,
          pieceCode: 'OU',
          promote: false,
          dropPieceCode: null,
          capturedPieceCode: null,
          notation: null,
        },
      }),
    ).not.toThrow();
  });

  it('rejects a move outside the session piece catalog legal range', () => {
    expect(() =>
      assertMoveAllowedBySessionCatalog({
        position: createPosition(),
        pieceCatalog,
        actor: 'enemy',
        move: {
          fromRow: 1,
          fromCol: 4,
          toRow: 3,
          toCol: 4,
          pieceCode: 'OU',
          promote: false,
          dropPieceCode: null,
          capturedPieceCode: null,
          notation: null,
        },
      }),
    ).toThrow('guardrail rejected move: move is outside session catalog legal range');
  });
});
