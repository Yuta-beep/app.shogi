import { generateLegalMoves } from '@/ai/engine/legal-moves';
import type { AiBattlePosition, AiPieceDefinition } from '@/ai/model';

function catalogFor(chars: Array<{ char: string; code: string }>): AiPieceDefinition[] {
  return chars.map(({ char, code }) => ({
    char,
    name: char,
    unlock: '',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [],
    isRepeatable: false,
    pieceCode: code,
  }));
}

function movesFrom(char: string, code: string, row: number, col: number): string[] {
  const position: AiBattlePosition = {
    sideToMove: 'player',
    turnNumber: 1,
    moveCount: 0,
    sfen: 'seed',
    stateHash: 'seed',
    boardState: {
      pieces: [{ side: 'player', row, col, pieceCode: code, char, promoted: false }],
    },
    hands: { player: {}, enemy: {} },
  };
  const legal = generateLegalMoves({
    position,
    pieceCatalog: catalogFor([{ char, code }]),
  });
  return legal.legalMoves
    .filter((m) => m.fromRow === row && m.fromCol === col)
    .map((m) => `${m.toRow}:${m.toCol}`)
    .sort();
}

describe('辺・逸 前と斜め4方向1マス', () => {
  it.each([
    ['辺', 'piece_gacha_hen'],
    ['逸', 'piece_gacha_itsu'],
  ])('%s は前1+斜め4方向のみ', (char, code) => {
    expect(movesFrom(char, code, 4, 4)).toEqual(['3:3', '3:4', '3:5', '5:3', '5:5'].sort());
  });
});
