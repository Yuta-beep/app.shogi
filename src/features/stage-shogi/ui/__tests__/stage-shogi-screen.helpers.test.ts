import type { BoardPiece } from '@/features/stage-shogi/ui/stage-shogi-screen.helpers';
import {
  applyKirinImmunityShieldMarkToPieces,
  immobilizedKeysFromCanonical,
  kirinShowsImmunityShieldMark,
  reconcileExtendedPieceHandsAgainstBoard,
} from '@/features/stage-shogi/ui/stage-shogi-screen.helpers';

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
        imageSignedUrl: null,
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
        imageSignedUrl: null,
      },
    ];
    const out = reconcileExtendedPieceHandsAgainstBoard(hands, pieces);
    expect(out.player.MACHINE).toBe(2);
  });

  it('does not subtract on-board HOLE from in-hand count', () => {
    const hands = {
      player: { HOLE: 1 },
      enemy: {},
    };
    const pieces: BoardPiece[] = [
      {
        side: 'player',
        row: 3,
        col: 3,
        pieceCode: 'HOLE',
        char: '穴',
        promoted: false,
        imageSignedUrl: null,
      },
    ];
    const out = reconcileExtendedPieceHandsAgainstBoard(hands, pieces);
    expect(out.player.HOLE).toBe(1);
  });

  it('does not subtract on-board ABYSS from in-hand count', () => {
    const hands = {
      player: { ABYSS: 1 },
      enemy: {},
    };
    const pieces: BoardPiece[] = [
      {
        side: 'player',
        row: 5,
        col: 5,
        pieceCode: 'ABYSS',
        char: '淵',
        promoted: false,
        imageSignedUrl: null,
      },
    ];
    const out = reconcileExtendedPieceHandsAgainstBoard(hands, pieces);
    expect(out.player.ABYSS).toBe(1);
  });

  it('does not subtract on-board COW from in-hand COW (captured piece vs own piece)', () => {
    const hands = { player: {}, enemy: { COW: 1 } };
    const pieces: BoardPiece[] = [
      {
        side: 'enemy',
        row: 4,
        col: 4,
        pieceCode: 'COW',
        char: '牛',
        promoted: false,
        imageSignedUrl: null,
      },
    ];
    const out = reconcileExtendedPieceHandsAgainstBoard(hands, pieces);
    expect(out.enemy.COW).toBe(1);
  });

  it('does not subtract on-board PIG from in-hand PIG', () => {
    const hands = { player: {}, enemy: { PIG: 1 } };
    const pieces: BoardPiece[] = [
      {
        side: 'enemy',
        row: 3,
        col: 3,
        pieceCode: 'PIG',
        char: '豚',
        promoted: false,
        imageSignedUrl: null,
      },
    ];
    const out = reconcileExtendedPieceHandsAgainstBoard(hands, pieces);
    expect(out.enemy.PIG).toBe(1);
  });

  it('does not subtract on-board CHICKEN from in-hand CHICKEN', () => {
    const hands = { player: {}, enemy: { CHICKEN: 1 } };
    const pieces: BoardPiece[] = [
      {
        side: 'enemy',
        row: 2,
        col: 2,
        pieceCode: 'CHICKEN',
        char: '鶏',
        promoted: false,
        imageSignedUrl: null,
      },
    ];
    const out = reconcileExtendedPieceHandsAgainstBoard(hands, pieces);
    expect(out.enemy.CHICKEN).toBe(1);
  });

  it('does not subtract on-board HAA from in-hand HAA (CODE_TO_CHAR extended)', () => {
    const hands = { player: {}, enemy: { HAA: 1 } };
    const pieces: BoardPiece[] = [
      {
        side: 'enemy',
        row: 1,
        col: 1,
        pieceCode: 'HAA',
        char: '葉',
        promoted: false,
        imageSignedUrl: null,
      },
    ];
    const out = reconcileExtendedPieceHandsAgainstBoard(hands, pieces);
    expect(out.enemy.HAA).toBe(1);
  });
});

describe('immobilizedKeysFromCanonical', () => {
  it('駒ショップPの同行・同列の敵を移動不能キーに含める', () => {
    const keys = immobilizedKeysFromCanonical({
      sideToMove: 'enemy',
      turnNumber: 1,
      moveCount: 0,
      sfen: '9/9/9/9/9/9/9/9/9 b - 1',
      stateHash: 'p-ui',
      boardState: {
        pieces: [
          { side: 'enemy', row: 4, col: 2, pieceCode: 'FU', char: '歩', promoted: false },
          {
            side: 'player',
            row: 4,
            col: 4,
            pieceCode: 'piece_shop_p',
            char: 'P',
            promoted: false,
          },
        ],
      },
      hands: { player: {}, enemy: {} },
    });
    expect(keys.has('enemy:4:2')).toBe(true);
    expect(keys.has('player:4:4')).toBe(false);
  });
});

describe('applyKirinImmunityShieldMarkToPieces', () => {
  const kirin: BoardPiece = {
    side: 'player',
    row: 4,
    col: 4,
    pieceCode: 'piece_shop_kirin',
    char: '麒',
    promoted: false,
    imageSignedUrl: null,
  };

  it('敵の歩・金・銀に隣接しているときだけ盾マークを付ける', () => {
    const withPawn = applyKirinImmunityShieldMarkToPieces([
      kirin,
      {
        side: 'enemy',
        row: 4,
        col: 5,
        pieceCode: 'FU',
        char: '歩',
        promoted: false,
        imageSignedUrl: null,
      },
    ]);
    expect(withPawn[0]?.kirinImmunityShieldMark).toBe(true);

    const withKnight = applyKirinImmunityShieldMarkToPieces([
      kirin,
      {
        side: 'enemy',
        row: 2,
        col: 4,
        pieceCode: 'KE',
        char: '桂',
        promoted: false,
        imageSignedUrl: null,
      },
    ]);
    expect(withKnight[0]?.kirinImmunityShieldMark).toBe(false);
  });

  it('敵が隣接から離れると盾マークが消える', () => {
    const kirin: BoardPiece = {
      side: 'player',
      row: 4,
      col: 4,
      pieceCode: 'piece_shop_kirin',
      char: '麒',
      promoted: false,
      imageSignedUrl: null,
    };
    const adjacent = [
      kirin,
      {
        side: 'enemy',
        row: 4,
        col: 5,
        pieceCode: 'FU',
        char: '歩',
        promoted: false,
        imageSignedUrl: null,
      },
    ];
    expect(kirinShowsImmunityShieldMark(adjacent, kirin)).toBe(true);
    const far = [
      kirin,
      {
        side: 'enemy',
        row: 2,
        col: 2,
        pieceCode: 'FU',
        char: '歩',
        promoted: false,
        imageSignedUrl: null,
      },
    ];
    expect(kirinShowsImmunityShieldMark(far, kirin)).toBe(false);
  });
});
