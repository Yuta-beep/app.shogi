import type { BoardPiece } from '@/features/stage-shogi/domain/game-rules';
import { reconcileExtendedPieceHandsAgainstBoard } from '@/features/stage-shogi/ui/stage-shogi-screen.helpers';

describe('reconcileExtendedPieceHandsAgainstBoard', () => {
  it('does not subtract on-board GEAR from in-hand count (canonical hands are already in-hand only)', () => {
    const hands = {
      player: { GEAR: 1 },
      enemy: {},
    };
    const pieces: BoardPiece[] = [
      {
        side: 'player',
        row: 4,
        col: 4,
        pieceCode: 'GEAR',
        char: '歯',
        promoted: false,
      },
    ];
    const out = reconcileExtendedPieceHandsAgainstBoard(hands, pieces);
    expect(out.player.GEAR).toBe(1);
  });

  it('does not subtract on-board MACHINE from in-hand count', () => {
    const hands = {
      player: { MACHINE: 2 },
      enemy: {},
    };
    const pieces: BoardPiece[] = [
      {
        side: 'player',
        row: 2,
        col: 2,
        pieceCode: 'MACHINE',
        char: '機',
        promoted: false,
      },
    ];
    const out = reconcileExtendedPieceHandsAgainstBoard(hands, pieces);
    expect(out.player.MACHINE).toBe(2);
  });
});
