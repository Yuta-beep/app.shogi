import { generateLegalMoves } from '@/ai/engine/legal-moves';
import { mergeStageFixedPitHazardsIntoPosition } from '@/ai/engine/stage-fixed-hazards';
import {
  batsuHazardCellsForDisplay,
  positionWithStageFixedBoardTiles,
} from '@/features/stage-shogi/ui/stage-shogi-screen.helpers';
import { tickSkillStateDurations } from '@/ai/engine/skill-runtime';
import {
  createLocalBattleGame,
  getLocalBattleGame,
  resetLocalBattleRegistry,
} from '@/ai/local-battle-registry';
import type { AiBattlePosition } from '@/ai/model';

function pitCells(position: AiBattlePosition): string[] {
  const skillState = (position.boardState as { skill_state?: { board_hazards?: unknown[] } })
    .skill_state;
  return (skillState?.board_hazards ?? [])
    .filter((h) => (h as { hazard_type?: string }).hazard_type === 'pit_cell')
    .map((h) => `${(h as { row: number }).row}:${(h as { col: number }).col}`)
    .sort();
}

describe('ステージ10 常設×マス', () => {
  beforeEach(() => resetLocalBattleRegistry());
  afterEach(() => resetLocalBattleRegistry());

  it('(5,4)(5,5)(5,6) を board_hazards にマージする', () => {
    const base: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: 'seed',
      stateHash: 'seed',
      boardState: { pieces: [] },
      hands: { player: {}, enemy: {} },
    };
    const merged = mergeStageFixedPitHazardsIntoPosition(base, 10);
    expect(pitCells(merged)).toEqual(['4:3', '4:4', '4:5']);
  });

  it('1手目の表示用局面でも×マスが抽出できる', () => {
    const base: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: 'seed',
      stateHash: 'seed',
      boardState: { pieces: [] },
      hands: { player: {}, enemy: {} },
    };
    const display = positionWithStageFixedBoardTiles(base, 10);
    expect(
      batsuHazardCellsForDisplay(display)
        .map((c) => `${c.row}:${c.col}`)
        .sort(),
    ).toEqual(['4:3', '4:4', '4:5']);
  });

  it('tick 後も stage_fixed × は残る', () => {
    const base: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: 'seed',
      stateHash: 'seed',
      boardState: { pieces: [] },
      hands: { player: {}, enemy: {} },
    };
    const merged = mergeStageFixedPitHazardsIntoPosition(base, 10);
    tickSkillStateDurations(merged);
    expect(pitCells(merged)).toEqual(['4:3', '4:4', '4:5']);
  });

  it('×マス上への移動は合法手に含まれない', () => {
    const merged = mergeStageFixedPitHazardsIntoPosition(
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
      10,
    );
    const legal = generateLegalMoves({
      position: merged,
      pieceCatalog: [
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
      ],
    });
    const targets = legal.legalMoves.map((m) => `${m.toRow}:${m.toCol}`);
    expect(targets).not.toContain('4:3');
    expect(targets).not.toContain('4:4');
    expect(targets).not.toContain('4:5');
  });

  it('local battle で stageNo=10 のとき取得時も維持される', () => {
    const created = createLocalBattleGame({
      playerId: 'p1',
      stageNo: 10,
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
    expect(pitCells(loaded!.position)).toEqual(['4:3', '4:4', '4:5']);
  });
});

describe('ステージ13 常設×マス', () => {
  beforeEach(() => resetLocalBattleRegistry());
  afterEach(() => resetLocalBattleRegistry());

  it('(5,1)(5,3)(5,7)(5,9) を board_hazards にマージする', () => {
    const base: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: 'seed',
      stateHash: 'seed',
      boardState: { pieces: [] },
      hands: { player: {}, enemy: {} },
    };
    const merged = mergeStageFixedPitHazardsIntoPosition(base, 13);
    expect(pitCells(merged)).toEqual(['4:0', '4:2', '4:6', '4:8']);
  });

  it('tick 後も stage_fixed × は残る', () => {
    const base: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: 'seed',
      stateHash: 'seed',
      boardState: { pieces: [] },
      hands: { player: {}, enemy: {} },
    };
    const merged = mergeStageFixedPitHazardsIntoPosition(base, 13);
    tickSkillStateDurations(merged);
    expect(pitCells(merged)).toEqual(['4:0', '4:2', '4:6', '4:8']);
  });

  it('local battle で stageNo=13 のとき取得時も維持される', () => {
    const created = createLocalBattleGame({
      playerId: 'p1',
      stageNo: 13,
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
    expect(pitCells(loaded!.position)).toEqual(['4:0', '4:2', '4:6', '4:8']);
  });
});

describe('ステージ17 常設×マス', () => {
  beforeEach(() => resetLocalBattleRegistry());
  afterEach(() => resetLocalBattleRegistry());

  it('(5,2)(5,4)(5,6)(5,8) を board_hazards にマージする', () => {
    const base: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: 'seed',
      stateHash: 'seed',
      boardState: { pieces: [] },
      hands: { player: {}, enemy: {} },
    };
    const merged = mergeStageFixedPitHazardsIntoPosition(base, 17);
    expect(pitCells(merged)).toEqual(['4:1', '4:3', '4:5', '4:7']);
  });

  it('tick 後も stage_fixed × は残る', () => {
    const base: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: 'seed',
      stateHash: 'seed',
      boardState: { pieces: [] },
      hands: { player: {}, enemy: {} },
    };
    const merged = mergeStageFixedPitHazardsIntoPosition(base, 17);
    tickSkillStateDurations(merged);
    expect(pitCells(merged)).toEqual(['4:1', '4:3', '4:5', '4:7']);
  });

  it('local battle で stageNo=17 のとき取得時も維持される', () => {
    const created = createLocalBattleGame({
      playerId: 'p1',
      stageNo: 17,
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
    expect(pitCells(loaded!.position)).toEqual(['4:1', '4:3', '4:5', '4:7']);
  });
});

describe('ステージ19 常設×マス', () => {
  beforeEach(() => resetLocalBattleRegistry());
  afterEach(() => resetLocalBattleRegistry());

  it('(5,5) を board_hazards にマージする', () => {
    const base: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: 'seed',
      stateHash: 'seed',
      boardState: { pieces: [] },
      hands: { player: {}, enemy: {} },
    };
    const merged = mergeStageFixedPitHazardsIntoPosition(base, 19);
    expect(pitCells(merged)).toEqual(['4:4']);
  });

  it('tick 後も stage_fixed × は残る', () => {
    const base: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: 'seed',
      stateHash: 'seed',
      boardState: { pieces: [] },
      hands: { player: {}, enemy: {} },
    };
    const merged = mergeStageFixedPitHazardsIntoPosition(base, 19);
    tickSkillStateDurations(merged);
    expect(pitCells(merged)).toEqual(['4:4']);
  });

  it('local battle で stageNo=19 のとき取得時も維持される', () => {
    const created = createLocalBattleGame({
      playerId: 'p1',
      stageNo: 19,
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
    expect(pitCells(loaded!.position)).toEqual(['4:4']);
  });
});

describe('ステージ22 常設×マス', () => {
  beforeEach(() => resetLocalBattleRegistry());
  afterEach(() => resetLocalBattleRegistry());

  it('(5,5) を board_hazards にマージする', () => {
    const base: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: 'seed',
      stateHash: 'seed',
      boardState: { pieces: [] },
      hands: { player: {}, enemy: {} },
    };
    const merged = mergeStageFixedPitHazardsIntoPosition(base, 22);
    expect(pitCells(merged)).toEqual(['4:4']);
  });

  it('tick 後も stage_fixed × は残る', () => {
    const base: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: 'seed',
      stateHash: 'seed',
      boardState: { pieces: [] },
      hands: { player: {}, enemy: {} },
    };
    const merged = mergeStageFixedPitHazardsIntoPosition(base, 22);
    tickSkillStateDurations(merged);
    expect(pitCells(merged)).toEqual(['4:4']);
  });

  it('local battle で stageNo=22 のとき取得時も維持される', () => {
    const created = createLocalBattleGame({
      playerId: 'p1',
      stageNo: 22,
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
    expect(pitCells(loaded!.position)).toEqual(['4:4']);
  });
});

describe.each([20, 21, 26, 36, 48, 49])('ステージ%s 常設×マス', (stageNo) => {
  beforeEach(() => resetLocalBattleRegistry());
  afterEach(() => resetLocalBattleRegistry());

  it('(5,3)(5,7) を board_hazards にマージする', () => {
    const base: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: 'seed',
      stateHash: 'seed',
      boardState: { pieces: [] },
      hands: { player: {}, enemy: {} },
    };
    const merged = mergeStageFixedPitHazardsIntoPosition(base, stageNo);
    expect(pitCells(merged)).toEqual(['4:2', '4:6']);
  });

  it('tick 後も stage_fixed × は残る', () => {
    const base: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: 'seed',
      stateHash: 'seed',
      boardState: { pieces: [] },
      hands: { player: {}, enemy: {} },
    };
    const merged = mergeStageFixedPitHazardsIntoPosition(base, stageNo);
    tickSkillStateDurations(merged);
    expect(pitCells(merged)).toEqual(['4:2', '4:6']);
  });

  it('local battle で取得時も維持される', () => {
    const created = createLocalBattleGame({
      playerId: 'p1',
      stageNo,
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
    expect(pitCells(loaded!.position)).toEqual(['4:2', '4:6']);
  });
});

describe('ステージ33 常設×マス', () => {
  beforeEach(() => resetLocalBattleRegistry());
  afterEach(() => resetLocalBattleRegistry());

  it('(5,1)(5,3)(5,5)(5,7)(5,9) を board_hazards にマージする', () => {
    const base: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: 'seed',
      stateHash: 'seed',
      boardState: { pieces: [] },
      hands: { player: {}, enemy: {} },
    };
    const merged = mergeStageFixedPitHazardsIntoPosition(base, 33);
    expect(pitCells(merged)).toEqual(['4:0', '4:2', '4:4', '4:6', '4:8']);
  });

  it('tick 後も stage_fixed × は残る', () => {
    const merged = mergeStageFixedPitHazardsIntoPosition(
      {
        sideToMove: 'player',
        turnNumber: 1,
        moveCount: 0,
        sfen: 'seed',
        stateHash: 'seed',
        boardState: { pieces: [] },
        hands: { player: {}, enemy: {} },
      },
      33,
    );
    tickSkillStateDurations(merged);
    expect(pitCells(merged)).toEqual(['4:0', '4:2', '4:4', '4:6', '4:8']);
  });

  it('local battle で stageNo=33 のとき取得時も維持される', () => {
    const created = createLocalBattleGame({
      playerId: 'p1',
      stageNo: 33,
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
    expect(pitCells(loaded!.position)).toEqual(['4:0', '4:2', '4:4', '4:6', '4:8']);
  });
});

describe('ステージ41 常設×マス', () => {
  beforeEach(() => resetLocalBattleRegistry());
  afterEach(() => resetLocalBattleRegistry());

  it('(5,5) を board_hazards にマージする', () => {
    const base: AiBattlePosition = {
      sideToMove: 'player',
      turnNumber: 1,
      moveCount: 0,
      sfen: 'seed',
      stateHash: 'seed',
      boardState: { pieces: [] },
      hands: { player: {}, enemy: {} },
    };
    const merged = mergeStageFixedPitHazardsIntoPosition(base, 41);
    expect(pitCells(merged)).toEqual(['4:4']);
  });

  it('tick 後も stage_fixed × は残る', () => {
    const merged = mergeStageFixedPitHazardsIntoPosition(
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
    expect(pitCells(merged)).toEqual(['4:4']);
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
    expect(pitCells(loaded!.position)).toEqual(['4:4']);
  });
});
