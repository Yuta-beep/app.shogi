import {
  canonicalToMatchingWire,
  matchingWireToCanonicalPosition,
} from '@/lib/matching-server/canonical-game';
import type { MatchingGameState } from '@/domain/matching-server/protocol';

describe('matching-server canonical-game', () => {
  it('keeps standard game codes displayable through canonical conversion', () => {
    const wire: MatchingGameState = {
      version: 1,
      turn: 'black',
      board: {
        '7g': 'black:FU',
        '5i': 'black:OU',
        '3c': 'white:FU',
        '5a': 'white:OU',
      },
      hands: { black: { FU: 1 }, white: {} },
    };

    const position = matchingWireToCanonicalPosition(wire, []);
    const pieces =
      (position.boardState as { pieces?: Array<{ pieceCode?: string; char: string }> }).pieces ??
      [];

    expect(pieces.find((piece) => piece.pieceCode === 'FU')?.char).toBe('歩');
    expect(pieces.find((piece) => piece.pieceCode === 'OU')?.char).toBe('王');
    expect(canonicalToMatchingWire(position).board['7g']).toBe('black:FU');
  });
});
