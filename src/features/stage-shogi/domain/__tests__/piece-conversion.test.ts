import {
  createPieceSfenMapping,
  parseSfenHandsPart,
  resolveHandsStateFromCanonicalSfenAndJson,
  sfenCharToDisplayChar,
  toSfenBoardPure,
  toSfenHandsPure,
  tryHandsStateFromCanonicalSfen,
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

  it('round-trips hands SFEN with parseSfenHandsPart', () => {
    const hands: HandsState = { player: { FU: 2, NIN: 1 }, enemy: { HOU: 1 } };
    const sfenPart = toSfenHandsPure(hands, pieceSfenMapping);
    expect(parseSfenHandsPart(sfenPart, pieceSfenMapping)).toEqual(hands);
  });

  it('parses enemy-only special piece from lowercase SFEN letter', () => {
    expect(parseSfenHandsPart('e', pieceSfenMapping)).toEqual({
      player: {},
      enemy: { HOU: 1 },
    });
  });

  it('tryHandsStateFromCanonicalSfen reads the third SFEN field', () => {
    const sfen = '9/9/9/9/9/9/9/9/9 b 2PCe 1';
    expect(tryHandsStateFromCanonicalSfen(sfen, pieceSfenMapping)).toEqual({
      player: { FU: 2, NIN: 1 },
      enemy: { HOU: 1 },
    });
  });

  it('resolveHandsStateFromCanonicalSfenAndJson keeps JSON when SFEN hands is -', () => {
    const json: HandsState = { player: { FU: 1 }, enemy: {} };
    const sfen = '9/9/9/9/9/9/9/9/9 b - 1';
    expect(resolveHandsStateFromCanonicalSfenAndJson(sfen, pieceSfenMapping, json)).toEqual(json);
  });

  it('resolveHandsStateFromCanonicalSfenAndJson prefers SFEN when it carries hands', () => {
    const json: HandsState = { player: { HOU: 1 }, enemy: {} };
    const sfen = '9/9/9/9/9/9/9/9/9 b e 1';
    expect(resolveHandsStateFromCanonicalSfenAndJson(sfen, pieceSfenMapping, json)).toEqual({
      player: {},
      enemy: { HOU: 1 },
    });
  });

  it('resolveHandsStateFromCanonicalSfenAndJson falls back to JSON when SFEN parses empty but JSON has pieces', () => {
    const json: HandsState = { player: { FU: 1 }, enemy: {} };
    const sfen = '9/9/9/9/9/9/9/9/9 b 3/ 1';
    expect(resolveHandsStateFromCanonicalSfenAndJson(sfen, pieceSfenMapping, json)).toEqual(json);
  });

  it('resolveHandsStateFromCanonicalSfenAndJson keeps JSON when it has more standard pieces than SFEN (stale SFEN after capture)', () => {
    const json: HandsState = { player: { FU: 2 }, enemy: {} };
    const sfen = '9/9/9/9/9/9/9/9/9 b P 1';
    expect(resolveHandsStateFromCanonicalSfenAndJson(sfen, pieceSfenMapping, json)).toEqual(json);
  });

  it('resolveHandsStateFromCanonicalSfenAndJson uses full SFEN when JSON has fewer total pieces', () => {
    const json: HandsState = { player: {}, enemy: {} };
    const sfen = '9/9/9/9/9/9/9/9/9 b P 1';
    expect(resolveHandsStateFromCanonicalSfenAndJson(sfen, pieceSfenMapping, json)).toEqual({
      player: { FU: 1 },
      enemy: {},
    });
  });

  it('normalizes DB multi-char sfen for mineral pieces and keeps them on the board string', () => {
    const mineralMapping = createPieceSfenMapping([
      {
        pieceCode: 'COPPER',
        sfenCode: 'ZAA',
        isPromoted: false,
        char: '銅',
        name: '',
        unlock: '',
        desc: '',
        skill: '',
        move: '',
        moveVectors: [],
        isRepeatable: false,
      },
      {
        pieceCode: 'LEAD',
        sfenCode: 'ZAB',
        isPromoted: false,
        char: '鉛',
        name: '',
        unlock: '',
        desc: '',
        skill: '',
        move: '',
        moveVectors: [],
        isRepeatable: false,
      },
    ]);
    expect(mineralMapping.codeToSfen.COPPER).toBe('A');
    expect(mineralMapping.codeToSfen.LEAD).toBe('!');
    expect(sfenCharToDisplayChar('a', false, mineralMapping)).toBe('COPPER');
    expect(sfenCharToDisplayChar('!', false, mineralMapping)).toBe('LEAD');

    const pieces: TestPiece[] = [
      { side: 'enemy', row: 0, col: 0, pieceCode: 'COPPER', char: '銅' },
      { side: 'enemy', row: 0, col: 1, pieceCode: 'LEAD', char: '鉛' },
    ];
    expect(toSfenBoardPure(pieces, mineralMapping)).toBe('a?7/9/9/9/9/9/9/9/9');
  });

  it('resolves mineral SFEN even when the catalog has no m_piece rows (fallback)', () => {
    const emptyCatalogMapping = createPieceSfenMapping([]);
    expect(sfenCharToDisplayChar('a', false, emptyCatalogMapping)).toBe('COPPER');
    expect(sfenCharToDisplayChar('o', false, emptyCatalogMapping)).toBe('IRON');
    expect(sfenCharToDisplayChar('z', false, emptyCatalogMapping)).toBe('TIN');
    expect(sfenCharToDisplayChar('!', false, emptyCatalogMapping)).toBe('LEAD');
  });

  it('parses enemy hand tokens that use symbol sfen atoms', () => {
    const mineralMapping = createPieceSfenMapping([
      {
        pieceCode: 'LEAD',
        sfenCode: 'ZAB',
        isPromoted: false,
        char: '鉛',
        name: '',
        unlock: '',
        desc: '',
        skill: '',
        move: '',
        moveVectors: [],
        isRepeatable: false,
      },
    ]);
    expect(parseSfenHandsPart('2?', mineralMapping)).toEqual({ player: {}, enemy: { LEAD: 2 } });
  });
});
