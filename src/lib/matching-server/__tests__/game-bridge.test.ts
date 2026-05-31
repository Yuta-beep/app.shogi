import {
  battleMoveToServerPayload,
  decodeEncodedBoardPiece,
  matchingGameToBoardPieces,
} from '@/lib/matching-server/game-bridge';
import type { MatchingGameState } from '@/domain/matching-server/protocol';

describe('matching-server game-bridge', () => {
  it('decodes promoted board cells', () => {
    expect(decodeEncodedBoardPiece('black:FU+')).toEqual({
      serverSide: 'black',
      code: 'FU',
      promoted: true,
    });
  });

  it('maps server board to ui pieces for black player', () => {
    const game: MatchingGameState = {
      version: 1,
      turn: 'black',
      board: { '7g': 'black:FU', '3c': 'white:OU' },
      hands: { black: {}, white: {} },
    };
    const pieces = matchingGameToBoardPieces(game, 'black');
    expect(pieces.find((p) => p.pieceCode === 'FU')?.side).toBe('player');
    expect(pieces.find((p) => p.pieceCode === 'FU')?.char).toBe('歩');
    expect(pieces.find((p) => p.pieceCode === 'OU')?.side).toBe('enemy');
    expect(pieces.find((p) => p.pieceCode === 'OU')?.char).toBe('玉');
  });

  it('converts battle move to server payload', () => {
    expect(
      battleMoveToServerPayload(
        {
          fromRow: 6,
          fromCol: 2,
          toRow: 5,
          toCol: 2,
          pieceCode: 'FU',
          promote: false,
          dropPieceCode: null,
          capturedPieceCode: null,
          notation: null,
        },
        'black',
      ),
    ).toEqual({
      from: '7g',
      to: '7f',
      piece: 'FU',
      promote: false,
      drop: false,
    });
  });

  it('converts drop move to server payload', () => {
    expect(
      battleMoveToServerPayload(
        {
          fromRow: null,
          fromCol: null,
          toRow: 4,
          toCol: 4,
          pieceCode: 'FU',
          promote: false,
          dropPieceCode: 'FU',
          capturedPieceCode: null,
          notation: null,
        },
        'black',
      ),
    ).toEqual({
      to: '5e',
      piece: 'FU',
      drop: true,
      promote: false,
    });
  });
});
