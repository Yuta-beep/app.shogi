import { applyMove } from '@/ai/engine/apply-move';
import * as guardrails from '@/ai/engine/guardrails';
import { generateLegalMoves } from '@/ai/engine/legal-moves';
import { mergeStageFixedArrowTilesIntoPosition } from '@/ai/engine/stage-fixed-arrow-tiles';
import {
  arrowCellsForDisplay,
  positionWithStageFixedBoardTiles,
} from '@/features/stage-shogi/ui/stage-shogi-screen.helpers';
import { tickSkillStateDurations } from '@/ai/engine/skill-runtime';
import {
  createLocalBattleGame,
  getLocalBattleGame,
  resetLocalBattleRegistry,
} from '@/ai/local-battle-registry';
import type { AiBattlePosition, AiPieceDefinition } from '@/ai/model';

const pieceCatalog: AiPieceDefinition[] = [
  {
    char: '王',
    name: '王',
    unlock: '',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [
      { dx: 0, dy: -1, maxStep: 1 },
      { dx: 0, dy: 1, maxStep: 1 },
      { dx: -1, dy: 0, maxStep: 1 },
      { dx: 1, dy: 0, maxStep: 1 },
      { dx: -1, dy: -1, maxStep: 1 },
      { dx: 1, dy: -1, maxStep: 1 },
      { dx: -1, dy: 1, maxStep: 1 },
      { dx: 1, dy: 1, maxStep: 1 },
    ],
    isRepeatable: false,
    pieceCode: 'OU',
  },
];

function arrowTiles(position: AiBattlePosition): string[] {
  const skillState = (position.boardState as { skill_state?: { board_arrow_tiles?: unknown[] } })
    .skill_state;
  return (skillState?.board_arrow_tiles ?? [])
    .map((t) => {
      const tile = t as { row: number; col: number; direction: string };
      return `${tile.row}:${tile.col}:${tile.direction}`;
    })
    .sort();
}

describe('ステージ23 矢印マス', () => {
  beforeEach(() => resetLocalBattleRegistry());
  afterEach(() => resetLocalBattleRegistry());

  it('4つの矢印タイルを board_arrow_tiles にマージする', () => {
    const base: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: 'seed',
      stateHash: 'seed',
      boardState: { pieces: [] },
      hands: { player: {}, enemy: {} },
    };
    const merged = mergeStageFixedArrowTilesIntoPosition(base, 23);
    expect(arrowTiles(merged)).toEqual(['3:5:left', '3:6:down', '5:2:up', '5:3:right']);
  });

  it('1手目の表示用局面でも矢印マスが抽出できる', () => {
    const base: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: 'seed',
      stateHash: 'seed',
      boardState: { pieces: [] },
      hands: { player: {}, enemy: {} },
    };
    const display = positionWithStageFixedBoardTiles(base, 23);
    expect(
      arrowCellsForDisplay(display)
        .map((c) => `${c.row}:${c.col}:${c.direction}`)
        .sort(),
    ).toEqual(['3:5:left', '3:6:down', '5:2:up', '5:3:right']);
  });

  it('tick 後も stage_fixed 矢印は残る', () => {
    const merged = mergeStageFixedArrowTilesIntoPosition(
      {
        sideToMove: 'player',
        turnNumber: 1,
        moveCount: 0,
        sfen: 'seed',
        stateHash: 'seed',
        boardState: { pieces: [] },
        hands: { player: {}, enemy: {} },
      },
      23,
    );
    tickSkillStateDurations(merged);
    expect(arrowTiles(merged)).toEqual(['3:5:left', '3:6:down', '5:2:up', '5:3:right']);
  });

  it('左矢印に入ると1マス左へスライドする', () => {
    jest
      .spyOn(guardrails, 'assertMoveAllowedBySessionCatalog')
      .mockImplementation((input) => input.move);
    const position = mergeStageFixedArrowTilesIntoPosition(
      {
        sideToMove: 'player',
        turnNumber: 1,
        moveCount: 0,
        sfen: 'seed',
        stateHash: 'seed',
        boardState: {
          pieces: [
            {
              side: 'player',
              row: 3,
              col: 4,
              pieceCode: 'OU',
              char: '王',
              promoted: false,
            },
          ],
        },
        hands: { player: {}, enemy: {} },
      },
      23,
    );
    const committed = applyMove({
      position,
      pieceCatalog,
      move: {
        fromRow: 3,
        fromCol: 4,
        toRow: 3,
        toCol: 5,
        notation: '3345',
        promote: false,
        capturedPieceCode: null,
        dropPieceCode: null,
        pieceCode: 'OU',
      },
    });
    const pieces = (
      committed.position.boardState as {
        pieces: { side: 'player' | 'enemy'; row: number; col: number }[];
      }
    ).pieces;
    const king = pieces.find((p) => p.side === 'player' && p.row === 3 && p.col === 4);
    expect(king).toBeDefined();
  });

  it('右矢印の先に味方がある手は合法手に含まれない', () => {
    const position = mergeStageFixedArrowTilesIntoPosition(
      {
        sideToMove: 'player',
        turnNumber: 1,
        moveCount: 0,
        sfen: 'seed',
        stateHash: 'seed',
        boardState: {
          pieces: [
            {
              side: 'player',
              row: 6,
              col: 3,
              pieceCode: 'OU',
              char: '王',
              promoted: false,
            },
            {
              side: 'player',
              row: 5,
              col: 4,
              pieceCode: 'OU',
              char: '王',
              promoted: false,
            },
          ],
        },
        hands: { player: {}, enemy: {} },
      },
      23,
    );
    const legal = generateLegalMoves({ position, pieceCatalog });
    const toRightArrow = legal.legalMoves.filter(
      (m) => m.fromRow === 6 && m.fromCol === 3 && m.toRow === 5 && m.toCol === 3,
    );
    expect(toRightArrow).toHaveLength(0);
  });

  it('local battle で stageNo=23 のとき取得時も維持される', () => {
    const created = createLocalBattleGame({
      playerId: 'p1',
      stageNo: 23,
      position: {
        sideToMove: 'player',
        turnNumber: 1,
        moveCount: 0,
        sfen: 'seed',
        stateHash: 'seed',
        boardState: { pieces: [] },
        hands: { player: {}, enemy: {} },
      },
    });
    const loaded = getLocalBattleGame(created.gameId);
    expect(arrowTiles(loaded!.position)).toEqual(['3:5:left', '3:6:down', '5:2:up', '5:3:right']);
  });
});

describe('ステージ28 矢印マス', () => {
  beforeEach(() => resetLocalBattleRegistry());
  afterEach(() => resetLocalBattleRegistry());

  it('(5,4)下 (5,6)上 を board_arrow_tiles にマージする', () => {
    const base: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: 'seed',
      stateHash: 'seed',
      boardState: { pieces: [] },
      hands: { player: {}, enemy: {} },
    };
    const merged = mergeStageFixedArrowTilesIntoPosition(base, 28);
    expect(arrowTiles(merged)).toEqual(['4:3:down', '4:5:up']);
  });

  it('tick 後も stage_fixed 矢印は残る', () => {
    const merged = mergeStageFixedArrowTilesIntoPosition(
      {
        sideToMove: 'player',
        turnNumber: 1,
        moveCount: 0,
        sfen: 'seed',
        stateHash: 'seed',
        boardState: { pieces: [] },
        hands: { player: {}, enemy: {} },
      },
      28,
    );
    tickSkillStateDurations(merged);
    expect(arrowTiles(merged)).toEqual(['4:3:down', '4:5:up']);
  });

  it('下矢印に入ると1マス下へスライドする', () => {
    jest
      .spyOn(guardrails, 'assertMoveAllowedBySessionCatalog')
      .mockImplementation((input) => input.move);
    const position = mergeStageFixedArrowTilesIntoPosition(
      {
        sideToMove: 'player',
        turnNumber: 1,
        moveCount: 0,
        sfen: 'seed',
        stateHash: 'seed',
        boardState: {
          pieces: [
            {
              side: 'player',
              row: 3,
              col: 3,
              pieceCode: 'OU',
              char: '王',
              promoted: false,
            },
          ],
        },
        hands: { player: {}, enemy: {} },
      },
      28,
    );
    const committed = applyMove({
      position,
      pieceCatalog,
      move: {
        fromRow: 3,
        fromCol: 3,
        toRow: 4,
        toCol: 3,
        notation: '3343',
        promote: false,
        capturedPieceCode: null,
        dropPieceCode: null,
        pieceCode: 'OU',
      },
    });
    const pieces = (
      committed.position.boardState as {
        pieces: { side: 'player' | 'enemy'; row: number; col: number }[];
      }
    ).pieces;
    const king = pieces.find((p) => p.side === 'player' && p.row === 5 && p.col === 3);
    expect(king).toBeDefined();
  });

  it('local battle で stageNo=28 のとき取得時も維持される', () => {
    const created = createLocalBattleGame({
      playerId: 'p1',
      stageNo: 28,
      position: {
        sideToMove: 'player',
        turnNumber: 1,
        moveCount: 0,
        sfen: 'seed',
        stateHash: 'seed',
        boardState: { pieces: [] },
        hands: { player: {}, enemy: {} },
      },
    });
    const loaded = getLocalBattleGame(created.gameId);
    expect(arrowTiles(loaded!.position)).toEqual(['4:3:down', '4:5:up']);
  });
});

describe('ステージ29 矢印マス', () => {
  beforeEach(() => resetLocalBattleRegistry());
  afterEach(() => resetLocalBattleRegistry());

  it('(5,2)(5,7)左 (5,3)(5,8)右 を board_arrow_tiles にマージする', () => {
    const base: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: 'seed',
      stateHash: 'seed',
      boardState: { pieces: [] },
      hands: { player: {}, enemy: {} },
    };
    const merged = mergeStageFixedArrowTilesIntoPosition(base, 29);
    expect(arrowTiles(merged)).toEqual(['4:1:left', '4:2:right', '4:6:left', '4:7:right']);
  });

  it('tick 後も stage_fixed 矢印は残る', () => {
    const merged = mergeStageFixedArrowTilesIntoPosition(
      {
        sideToMove: 'player',
        turnNumber: 1,
        moveCount: 0,
        sfen: 'seed',
        stateHash: 'seed',
        boardState: { pieces: [] },
        hands: { player: {}, enemy: {} },
      },
      29,
    );
    tickSkillStateDurations(merged);
    expect(arrowTiles(merged)).toEqual(['4:1:left', '4:2:right', '4:6:left', '4:7:right']);
  });

  it('右矢印に入ると1マス右へスライドする', () => {
    jest
      .spyOn(guardrails, 'assertMoveAllowedBySessionCatalog')
      .mockImplementation((input) => input.move);
    const position = mergeStageFixedArrowTilesIntoPosition(
      {
        sideToMove: 'player',
        turnNumber: 1,
        moveCount: 0,
        sfen: 'seed',
        stateHash: 'seed',
        boardState: {
          pieces: [
            {
              side: 'player',
              row: 4,
              col: 1,
              pieceCode: 'OU',
              char: '王',
              promoted: false,
            },
          ],
        },
        hands: { player: {}, enemy: {} },
      },
      29,
    );
    const committed = applyMove({
      position,
      pieceCatalog,
      move: {
        fromRow: 4,
        fromCol: 1,
        toRow: 4,
        toCol: 2,
        notation: '4142',
        promote: false,
        capturedPieceCode: null,
        dropPieceCode: null,
        pieceCode: 'OU',
      },
    });
    const pieces = (
      committed.position.boardState as {
        pieces: { side: 'player' | 'enemy'; row: number; col: number }[];
      }
    ).pieces;
    const king = pieces.find((p) => p.side === 'player' && p.row === 4 && p.col === 3);
    expect(king).toBeDefined();
  });

  it('local battle で stageNo=29 のとき取得時も維持される', () => {
    const created = createLocalBattleGame({
      playerId: 'p1',
      stageNo: 29,
      position: {
        sideToMove: 'player',
        turnNumber: 1,
        moveCount: 0,
        sfen: 'seed',
        stateHash: 'seed',
        boardState: { pieces: [] },
        hands: { player: {}, enemy: {} },
      },
    });
    const loaded = getLocalBattleGame(created.gameId);
    expect(arrowTiles(loaded!.position)).toEqual([
      '4:1:left',
      '4:2:right',
      '4:6:left',
      '4:7:right',
    ]);
  });
});

describe('ステージ34 矢印マス', () => {
  beforeEach(() => resetLocalBattleRegistry());
  afterEach(() => resetLocalBattleRegistry());

  it('(4,3)(4,7)下 (6,3)(6,7)上 を board_arrow_tiles にマージする', () => {
    const base: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: 'seed',
      stateHash: 'seed',
      boardState: { pieces: [] },
      hands: { player: {}, enemy: {} },
    };
    const merged = mergeStageFixedArrowTilesIntoPosition(base, 34);
    expect(arrowTiles(merged)).toEqual(['3:2:down', '3:6:down', '5:2:up', '5:6:up']);
  });

  it('tick 後も stage_fixed 矢印は残る', () => {
    const merged = mergeStageFixedArrowTilesIntoPosition(
      {
        sideToMove: 'player',
        turnNumber: 1,
        moveCount: 0,
        sfen: 'seed',
        stateHash: 'seed',
        boardState: { pieces: [] },
        hands: { player: {}, enemy: {} },
      },
      34,
    );
    tickSkillStateDurations(merged);
    expect(arrowTiles(merged)).toEqual(['3:2:down', '3:6:down', '5:2:up', '5:6:up']);
  });

  it('下矢印に入ると1マス下へスライドする', () => {
    jest
      .spyOn(guardrails, 'assertMoveAllowedBySessionCatalog')
      .mockImplementation((input) => input.move);
    const position = mergeStageFixedArrowTilesIntoPosition(
      {
        sideToMove: 'player',
        turnNumber: 1,
        moveCount: 0,
        sfen: 'seed',
        stateHash: 'seed',
        boardState: {
          pieces: [
            {
              side: 'player',
              row: 2,
              col: 2,
              pieceCode: 'OU',
              char: '王',
              promoted: false,
            },
          ],
        },
        hands: { player: {}, enemy: {} },
      },
      34,
    );
    const committed = applyMove({
      position,
      pieceCatalog,
      move: {
        fromRow: 2,
        fromCol: 2,
        toRow: 3,
        toCol: 2,
        notation: '2232',
        promote: false,
        capturedPieceCode: null,
        dropPieceCode: null,
        pieceCode: 'OU',
      },
    });
    const pieces = (
      committed.position.boardState as {
        pieces: { side: 'player' | 'enemy'; row: number; col: number }[];
      }
    ).pieces;
    const king = pieces.find((p) => p.side === 'player' && p.row === 4 && p.col === 2);
    expect(king).toBeDefined();
  });

  it('local battle で stageNo=34 のとき取得時も維持される', () => {
    const created = createLocalBattleGame({
      playerId: 'p1',
      stageNo: 34,
      position: {
        sideToMove: 'player',
        turnNumber: 1,
        moveCount: 0,
        sfen: 'seed',
        stateHash: 'seed',
        boardState: { pieces: [] },
        hands: { player: {}, enemy: {} },
      },
    });
    const loaded = getLocalBattleGame(created.gameId);
    expect(arrowTiles(loaded!.position)).toEqual(['3:2:down', '3:6:down', '5:2:up', '5:6:up']);
  });
});

describe('ステージ38 矢印マス', () => {
  beforeEach(() => resetLocalBattleRegistry());
  afterEach(() => resetLocalBattleRegistry());

  it('(5,3)(5,7)右 を board_arrow_tiles にマージする', () => {
    const base: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: 'seed',
      stateHash: 'seed',
      boardState: { pieces: [] },
      hands: { player: {}, enemy: {} },
    };
    const merged = mergeStageFixedArrowTilesIntoPosition(base, 38);
    expect(arrowTiles(merged)).toEqual(['4:2:right', '4:6:right']);
  });

  it('tick 後も stage_fixed 矢印は残る', () => {
    const merged = mergeStageFixedArrowTilesIntoPosition(
      {
        sideToMove: 'player',
        turnNumber: 1,
        moveCount: 0,
        sfen: 'seed',
        stateHash: 'seed',
        boardState: { pieces: [] },
        hands: { player: {}, enemy: {} },
      },
      38,
    );
    tickSkillStateDurations(merged);
    expect(arrowTiles(merged)).toEqual(['4:2:right', '4:6:right']);
  });

  it('右矢印に入ると1マス右へスライドする', () => {
    jest
      .spyOn(guardrails, 'assertMoveAllowedBySessionCatalog')
      .mockImplementation((input) => input.move);
    const position = mergeStageFixedArrowTilesIntoPosition(
      {
        sideToMove: 'player',
        turnNumber: 1,
        moveCount: 0,
        sfen: 'seed',
        stateHash: 'seed',
        boardState: {
          pieces: [
            {
              side: 'player',
              row: 4,
              col: 1,
              pieceCode: 'OU',
              char: '王',
              promoted: false,
            },
          ],
        },
        hands: { player: {}, enemy: {} },
      },
      38,
    );
    const committed = applyMove({
      position,
      pieceCatalog,
      move: {
        fromRow: 4,
        fromCol: 1,
        toRow: 4,
        toCol: 2,
        notation: '4142',
        promote: false,
        capturedPieceCode: null,
        dropPieceCode: null,
        pieceCode: 'OU',
      },
    });
    const pieces = (
      committed.position.boardState as {
        pieces: { side: 'player' | 'enemy'; row: number; col: number }[];
      }
    ).pieces;
    const king = pieces.find((p) => p.side === 'player' && p.row === 4 && p.col === 3);
    expect(king).toBeDefined();
  });

  it('local battle で stageNo=38 のとき取得時も維持される', () => {
    const created = createLocalBattleGame({
      playerId: 'p1',
      stageNo: 38,
      position: {
        sideToMove: 'player',
        turnNumber: 1,
        moveCount: 0,
        sfen: 'seed',
        stateHash: 'seed',
        boardState: { pieces: [] },
        hands: { player: {}, enemy: {} },
      },
    });
    const loaded = getLocalBattleGame(created.gameId);
    expect(arrowTiles(loaded!.position)).toEqual(['4:2:right', '4:6:right']);
  });
});

describe('ステージ41 矢印マス', () => {
  beforeEach(() => resetLocalBattleRegistry());
  afterEach(() => resetLocalBattleRegistry());

  it('(5,3)上 (5,7)下 を board_arrow_tiles にマージする', () => {
    const base: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: 'seed',
      stateHash: 'seed',
      boardState: { pieces: [] },
      hands: { player: {}, enemy: {} },
    };
    const merged = mergeStageFixedArrowTilesIntoPosition(base, 41);
    expect(arrowTiles(merged)).toEqual(['4:2:up', '4:6:down']);
  });

  it('tick 後も stage_fixed 矢印は残る', () => {
    const merged = mergeStageFixedArrowTilesIntoPosition(
      {
        sideToMove: 'player',
        turnNumber: 1,
        moveCount: 0,
        sfen: 'seed',
        stateHash: 'seed',
        boardState: { pieces: [] },
        hands: { player: {}, enemy: {} },
      },
      41,
    );
    tickSkillStateDurations(merged);
    expect(arrowTiles(merged)).toEqual(['4:2:up', '4:6:down']);
  });

  it('上矢印に入ると1マス上へスライドする', () => {
    jest
      .spyOn(guardrails, 'assertMoveAllowedBySessionCatalog')
      .mockImplementation((input) => input.move);
    const position = mergeStageFixedArrowTilesIntoPosition(
      {
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
              col: 2,
              pieceCode: 'OU',
              char: '王',
              promoted: false,
            },
          ],
        },
        hands: { player: {}, enemy: {} },
      },
      41,
    );
    const committed = applyMove({
      position,
      pieceCatalog,
      move: {
        fromRow: 5,
        fromCol: 2,
        toRow: 4,
        toCol: 2,
        notation: '5242',
        promote: false,
        capturedPieceCode: null,
        dropPieceCode: null,
        pieceCode: 'OU',
      },
    });
    const pieces = (
      committed.position.boardState as {
        pieces: { side: 'player' | 'enemy'; row: number; col: number }[];
      }
    ).pieces;
    const king = pieces.find((p) => p.side === 'player' && p.row === 3 && p.col === 2);
    expect(king).toBeDefined();
  });

  it('下矢印に入ると1マス下へスライドする', () => {
    jest
      .spyOn(guardrails, 'assertMoveAllowedBySessionCatalog')
      .mockImplementation((input) => input.move);
    const position = mergeStageFixedArrowTilesIntoPosition(
      {
        sideToMove: 'player',
        turnNumber: 1,
        moveCount: 0,
        sfen: 'seed',
        stateHash: 'seed',
        boardState: {
          pieces: [
            {
              side: 'player',
              row: 3,
              col: 6,
              pieceCode: 'OU',
              char: '王',
              promoted: false,
            },
          ],
        },
        hands: { player: {}, enemy: {} },
      },
      41,
    );
    const committed = applyMove({
      position,
      pieceCatalog,
      move: {
        fromRow: 3,
        fromCol: 6,
        toRow: 4,
        toCol: 6,
        notation: '3646',
        promote: false,
        capturedPieceCode: null,
        dropPieceCode: null,
        pieceCode: 'OU',
      },
    });
    const pieces = (
      committed.position.boardState as {
        pieces: { side: 'player' | 'enemy'; row: number; col: number }[];
      }
    ).pieces;
    const king = pieces.find((p) => p.side === 'player' && p.row === 5 && p.col === 6);
    expect(king).toBeDefined();
  });

  it('local battle で stageNo=41 のとき取得時も維持される', () => {
    const created = createLocalBattleGame({
      playerId: 'p1',
      stageNo: 41,
      position: {
        sideToMove: 'player',
        turnNumber: 1,
        moveCount: 0,
        sfen: 'seed',
        stateHash: 'seed',
        boardState: { pieces: [] },
        hands: { player: {}, enemy: {} },
      },
    });
    const loaded = getLocalBattleGame(created.gameId);
    expect(arrowTiles(loaded!.position)).toEqual(['4:2:up', '4:6:down']);
  });
});

describe('ステージ45 矢印マス', () => {
  beforeEach(() => resetLocalBattleRegistry());
  afterEach(() => resetLocalBattleRegistry());

  const stage45Arrows = [
    '4:0:up',
    '4:1:down',
    '4:2:up',
    '4:3:down',
    '4:4:up',
    '4:5:down',
    '4:6:up',
    '4:7:down',
    '4:8:up',
  ];

  it('(5,1)(5,3)(5,5)(5,7)(5,9)上 (5,2)(5,4)(5,6)(5,8)下 を board_arrow_tiles にマージする', () => {
    const base: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: 'seed',
      stateHash: 'seed',
      boardState: { pieces: [] },
      hands: { player: {}, enemy: {} },
    };
    const merged = mergeStageFixedArrowTilesIntoPosition(base, 45);
    expect(arrowTiles(merged)).toEqual(stage45Arrows);
  });

  it('tick 後も stage_fixed 矢印は残る', () => {
    const merged = mergeStageFixedArrowTilesIntoPosition(
      {
        sideToMove: 'player',
        turnNumber: 1,
        moveCount: 0,
        sfen: 'seed',
        stateHash: 'seed',
        boardState: { pieces: [] },
        hands: { player: {}, enemy: {} },
      },
      45,
    );
    tickSkillStateDurations(merged);
    expect(arrowTiles(merged)).toEqual(stage45Arrows);
  });

  it('上矢印に入ると1マス上へスライドする', () => {
    jest
      .spyOn(guardrails, 'assertMoveAllowedBySessionCatalog')
      .mockImplementation((input) => input.move);
    const position = mergeStageFixedArrowTilesIntoPosition(
      {
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
              col: 0,
              pieceCode: 'OU',
              char: '王',
              promoted: false,
            },
          ],
        },
        hands: { player: {}, enemy: {} },
      },
      45,
    );
    const committed = applyMove({
      position,
      pieceCatalog,
      move: {
        fromRow: 5,
        fromCol: 0,
        toRow: 4,
        toCol: 0,
        notation: '5040',
        promote: false,
        capturedPieceCode: null,
        dropPieceCode: null,
        pieceCode: 'OU',
      },
    });
    const pieces = (
      committed.position.boardState as {
        pieces: { side: 'player' | 'enemy'; row: number; col: number }[];
      }
    ).pieces;
    const king = pieces.find((p) => p.side === 'player' && p.row === 3 && p.col === 0);
    expect(king).toBeDefined();
  });

  it('下矢印に入ると1マス下へスライドする', () => {
    jest
      .spyOn(guardrails, 'assertMoveAllowedBySessionCatalog')
      .mockImplementation((input) => input.move);
    const position = mergeStageFixedArrowTilesIntoPosition(
      {
        sideToMove: 'player',
        turnNumber: 1,
        moveCount: 0,
        sfen: 'seed',
        stateHash: 'seed',
        boardState: {
          pieces: [
            {
              side: 'player',
              row: 3,
              col: 1,
              pieceCode: 'OU',
              char: '王',
              promoted: false,
            },
          ],
        },
        hands: { player: {}, enemy: {} },
      },
      45,
    );
    const committed = applyMove({
      position,
      pieceCatalog,
      move: {
        fromRow: 3,
        fromCol: 1,
        toRow: 4,
        toCol: 1,
        notation: '3141',
        promote: false,
        capturedPieceCode: null,
        dropPieceCode: null,
        pieceCode: 'OU',
      },
    });
    const pieces = (
      committed.position.boardState as {
        pieces: { side: 'player' | 'enemy'; row: number; col: number }[];
      }
    ).pieces;
    const king = pieces.find((p) => p.side === 'player' && p.row === 5 && p.col === 1);
    expect(king).toBeDefined();
  });

  it('local battle で stageNo=45 のとき取得時も維持される', () => {
    const created = createLocalBattleGame({
      playerId: 'p1',
      stageNo: 45,
      position: {
        sideToMove: 'player',
        turnNumber: 1,
        moveCount: 0,
        sfen: 'seed',
        stateHash: 'seed',
        boardState: { pieces: [] },
        hands: { player: {}, enemy: {} },
      },
    });
    const loaded = getLocalBattleGame(created.gameId);
    expect(arrowTiles(loaded!.position)).toEqual(stage45Arrows);
  });
});

describe('ステージ49 矢印マス', () => {
  beforeEach(() => resetLocalBattleRegistry());
  afterEach(() => resetLocalBattleRegistry());

  const stage49Arrows = [
    '3:1:down',
    '3:3:down',
    '3:5:down',
    '3:7:down',
    '5:1:up',
    '5:3:up',
    '5:5:up',
    '5:7:up',
  ];

  it('(4,2)(4,4)(4,6)(4,8)下 (6,2)(6,4)(6,6)(6,8)上 を board_arrow_tiles にマージする', () => {
    const base: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: 'seed',
      stateHash: 'seed',
      boardState: { pieces: [] },
      hands: { player: {}, enemy: {} },
    };
    const merged = mergeStageFixedArrowTilesIntoPosition(base, 49);
    expect(arrowTiles(merged)).toEqual(stage49Arrows);
  });

  it('tick 後も stage_fixed 矢印は残る', () => {
    const merged = mergeStageFixedArrowTilesIntoPosition(
      {
        sideToMove: 'player',
        turnNumber: 1,
        moveCount: 0,
        sfen: 'seed',
        stateHash: 'seed',
        boardState: { pieces: [] },
        hands: { player: {}, enemy: {} },
      },
      49,
    );
    tickSkillStateDurations(merged);
    expect(arrowTiles(merged)).toEqual(stage49Arrows);
  });

  it('下矢印に入ると1マス下へスライドする', () => {
    jest
      .spyOn(guardrails, 'assertMoveAllowedBySessionCatalog')
      .mockImplementation((input) => input.move);
    const position = mergeStageFixedArrowTilesIntoPosition(
      {
        sideToMove: 'player',
        turnNumber: 1,
        moveCount: 0,
        sfen: 'seed',
        stateHash: 'seed',
        boardState: {
          pieces: [
            {
              side: 'player',
              row: 2,
              col: 1,
              pieceCode: 'OU',
              char: '王',
              promoted: false,
            },
          ],
        },
        hands: { player: {}, enemy: {} },
      },
      49,
    );
    const committed = applyMove({
      position,
      pieceCatalog,
      move: {
        fromRow: 2,
        fromCol: 1,
        toRow: 3,
        toCol: 1,
        notation: '2131',
        promote: false,
        capturedPieceCode: null,
        dropPieceCode: null,
        pieceCode: 'OU',
      },
    });
    const pieces = (
      committed.position.boardState as {
        pieces: { side: 'player' | 'enemy'; row: number; col: number }[];
      }
    ).pieces;
    const king = pieces.find((p) => p.side === 'player' && p.row === 4 && p.col === 1);
    expect(king).toBeDefined();
  });

  it('上矢印に入ると1マス上へスライドする', () => {
    jest
      .spyOn(guardrails, 'assertMoveAllowedBySessionCatalog')
      .mockImplementation((input) => input.move);
    const position = mergeStageFixedArrowTilesIntoPosition(
      {
        sideToMove: 'player',
        turnNumber: 1,
        moveCount: 0,
        sfen: 'seed',
        stateHash: 'seed',
        boardState: {
          pieces: [
            {
              side: 'player',
              row: 6,
              col: 1,
              pieceCode: 'OU',
              char: '王',
              promoted: false,
            },
          ],
        },
        hands: { player: {}, enemy: {} },
      },
      49,
    );
    const committed = applyMove({
      position,
      pieceCatalog,
      move: {
        fromRow: 6,
        fromCol: 1,
        toRow: 5,
        toCol: 1,
        notation: '6151',
        promote: false,
        capturedPieceCode: null,
        dropPieceCode: null,
        pieceCode: 'OU',
      },
    });
    const pieces = (
      committed.position.boardState as {
        pieces: { side: 'player' | 'enemy'; row: number; col: number }[];
      }
    ).pieces;
    const king = pieces.find((p) => p.side === 'player' && p.row === 4 && p.col === 1);
    expect(king).toBeDefined();
  });

  it('local battle で stageNo=49 のとき取得時も維持される', () => {
    const created = createLocalBattleGame({
      playerId: 'p1',
      stageNo: 49,
      position: {
        sideToMove: 'player',
        turnNumber: 1,
        moveCount: 0,
        sfen: 'seed',
        stateHash: 'seed',
        boardState: { pieces: [] },
        hands: { player: {}, enemy: {} },
      },
    });
    const loaded = getLocalBattleGame(created.gameId);
    expect(arrowTiles(loaded!.position)).toEqual(stage49Arrows);
  });
});
