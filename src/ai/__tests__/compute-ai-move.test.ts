import { computeAiMove } from '@/ai/engine/compute-ai-move';
import type { AiBattlePosition, AiPieceDefinition } from '@/ai/model';

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
    pieceCode: 'KI',
    canonicalCode: 'KI',
    sfenCode: 'G',
    char: '金',
    name: '金',
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
      { dx: 0, dy: 1, maxStep: 1 },
    ],
    isRepeatable: true,
  },
];

describe('ai engine compute ai move', () => {
  it('returns player win when enemy has no legal move', () => {
    const position: AiBattlePosition = {
      sideToMove: 'enemy',
      turnNumber: 2,
      moveCount: 1,
      sfen: '9/9/9/9/9/9/9/9/4K4 w - 2',
      stateHash: 'seed',
      boardState: {
        pieces: [{ side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false }],
      },
      hands: { player: {}, enemy: {} },
    };

    const result = computeAiMove({ position, pieceCatalog });

    expect(result.selectedMove).toBeNull();
    expect(result.game.result).toBe('player_win');
  });

  it('returns meta for a computed move', () => {
    const position: AiBattlePosition = {
      sideToMove: 'enemy',
      turnNumber: 2,
      moveCount: 1,
      sfen: '9/9/9/9/9/9/4g4/4K4/9 w - 2',
      stateHash: 'seed-2',
      boardState: {
        pieces: [
          { side: 'enemy', row: 6, col: 4, pieceCode: 'KI', char: '金', promoted: false },
          { side: 'player', row: 7, col: 4, pieceCode: 'OU', char: '王', promoted: false },
        ],
      },
      hands: { player: {}, enemy: {} },
    };

    const result = computeAiMove({ position, pieceCatalog });

    expect(result.selectedMove).not.toBeNull();
    expect(result.meta?.candidateCount).toBeGreaterThan(0);
    expect(result.meta?.engineVersion).toBe('local-ts');
  });
});
