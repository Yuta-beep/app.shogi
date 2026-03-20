import {
  createPieceSfenMapping,
  sfenCharToDisplayChar,
  toSfenBoardPure,
  toSfenHandsPure,
} from '@/features/stage-shogi/domain/piece-conversion';
import type { HandsState } from '@/features/stage-shogi/domain/game-rules';

const pieceSfenMapping = createPieceSfenMapping([
  {
    pieceCode: 'FU',
    sfenCode: 'P',
    isPromoted: false,
    char: '歩',
    name: '',
    unlock: '',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [],
    isRepeatable: false,
  },
  {
    pieceCode: 'KY',
    sfenCode: 'L',
    isPromoted: false,
    char: '香',
    name: '',
    unlock: '',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [],
    isRepeatable: false,
  },
  {
    pieceCode: 'KE',
    sfenCode: 'N',
    isPromoted: false,
    char: '桂',
    name: '',
    unlock: '',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [],
    isRepeatable: false,
  },
  {
    pieceCode: 'GI',
    sfenCode: 'S',
    isPromoted: false,
    char: '銀',
    name: '',
    unlock: '',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [],
    isRepeatable: false,
  },
  {
    pieceCode: 'KI',
    sfenCode: 'G',
    isPromoted: false,
    char: '金',
    name: '',
    unlock: '',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [],
    isRepeatable: false,
  },
  {
    pieceCode: 'KA',
    sfenCode: 'B',
    isPromoted: false,
    char: '角',
    name: '',
    unlock: '',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [],
    isRepeatable: false,
  },
  {
    pieceCode: 'HI',
    sfenCode: 'R',
    isPromoted: false,
    char: '飛',
    name: '',
    unlock: '',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [],
    isRepeatable: false,
  },
  {
    pieceCode: 'OU',
    sfenCode: 'K',
    isPromoted: false,
    char: '王',
    name: '',
    unlock: '',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [],
    isRepeatable: false,
  },
  {
    pieceCode: 'TO',
    sfenCode: 'P',
    isPromoted: true,
    char: 'と',
    name: '',
    unlock: '',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [],
    isRepeatable: false,
  },
  {
    pieceCode: 'NY',
    sfenCode: 'L',
    isPromoted: true,
    char: '成香',
    name: '',
    unlock: '',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [],
    isRepeatable: false,
  },
  {
    pieceCode: 'NK',
    sfenCode: 'N',
    isPromoted: true,
    char: '成桂',
    name: '',
    unlock: '',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [],
    isRepeatable: false,
  },
  {
    pieceCode: 'NG',
    sfenCode: 'S',
    isPromoted: true,
    char: '成銀',
    name: '',
    unlock: '',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [],
    isRepeatable: false,
  },
  {
    pieceCode: 'UM',
    sfenCode: 'B',
    isPromoted: true,
    char: '馬',
    name: '',
    unlock: '',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [],
    isRepeatable: false,
  },
  {
    pieceCode: 'RY',
    sfenCode: 'R',
    isPromoted: true,
    char: '龍',
    name: '',
    unlock: '',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [],
    isRepeatable: false,
  },
  {
    pieceCode: 'NIN',
    sfenCode: 'C',
    isPromoted: false,
    char: '忍',
    name: '',
    unlock: '',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [],
    isRepeatable: false,
  },
  {
    pieceCode: 'KAG',
    sfenCode: 'D',
    isPromoted: false,
    char: '影',
    name: '',
    unlock: '',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [],
    isRepeatable: false,
  },
  {
    pieceCode: 'HOU',
    sfenCode: 'E',
    isPromoted: false,
    char: '砲',
    name: '',
    unlock: '',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [],
    isRepeatable: false,
  },
]);

type TestPiece = {
  side: 'player' | 'enemy';
  row: number;
  col: number;
  pieceCode: string | null;
  char: string;
  promoted?: boolean;
};

describe('piece conversion via DB-derived mapping', () => {
  it('parses standard and promoted SFEN using the catalog mapping', () => {
    expect(sfenCharToDisplayChar('P', false, pieceSfenMapping)).toBe('FU');
    expect(sfenCharToDisplayChar('p', false, pieceSfenMapping)).toBe('FU');
    expect(sfenCharToDisplayChar('P', true, pieceSfenMapping)).toBe('TO');
  });

  it('parses special SFEN using the catalog mapping', () => {
    expect(sfenCharToDisplayChar('C', false, pieceSfenMapping)).toBe('NIN');
    expect(sfenCharToDisplayChar('D', false, pieceSfenMapping)).toBe('KAG');
    expect(sfenCharToDisplayChar('E', false, pieceSfenMapping)).toBe('HOU');
  });

  it('serializes special pieces onto the board SFEN instead of skipping them', () => {
    const pieces: TestPiece[] = [
      { side: 'player', row: 4, col: 4, pieceCode: 'NIN', char: '忍' },
      { side: 'enemy', row: 4, col: 5, pieceCode: 'HOU', char: '砲' },
    ];
    expect(toSfenBoardPure(pieces, pieceSfenMapping)).toBe('9/9/9/9/4Ce3/9/9/9/9');
  });

  it('serializes promoted pieces with + prefix', () => {
    const pieces: TestPiece[] = [
      { side: 'player', row: 0, col: 0, pieceCode: 'FU', char: 'と', promoted: true },
    ];
    expect(toSfenBoardPure(pieces, pieceSfenMapping)).toBe('+P8/9/9/9/9/9/9/9/9');
  });

  it('serializes special hands instead of dropping them', () => {
    const hands: HandsState = { player: { FU: 2, NIN: 1 }, enemy: { HOU: 1 } };
    expect(toSfenHandsPure(hands, pieceSfenMapping)).toBe('2PCe');
  });

  it('returns - when no hands exist', () => {
    expect(toSfenHandsPure({ player: {}, enemy: {} }, pieceSfenMapping)).toBe('-');
  });
});
