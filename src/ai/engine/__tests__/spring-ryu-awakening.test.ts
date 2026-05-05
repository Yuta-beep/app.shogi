import { buildPieceLookups, normalizePieceCatalog } from '@/ai/model';
import type { PieceCatalogItem } from '@/usecases/piece-info/load-piece-catalog-usecase';
import {
  effectivePieceForRulesAfterSpring,
  hasAllySpringPieceOnBoard,
  isUnpromotedSmallDragonPiece,
  mapPiecesForSpringDragonAwakeningDisplay,
} from '@/ai/engine/spring-ryu-awakening';

const catalog: PieceCatalogItem[] = [
  {
    char: '泉',
    pieceCode: 'SPRING',
    sfenCode: 'ZQN',
    name: '泉',
    unlock: 't',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [],
    isRepeatable: false,
  },
  {
    char: '竜',
    pieceCode: 'RYU',
    sfenCode: 'F',
    name: '竜',
    unlock: 't',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [{ dx: 0, dy: -1, maxStep: 2 }],
    isRepeatable: false,
  },
  {
    char: '辰',
    pieceCode: 'TATSU',
    sfenCode: 'ZTS',
    name: '辰',
    unlock: 't',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [{ dx: 0, dy: -1, maxStep: 9 }],
    isRepeatable: false,
  },
];

describe('spring-ryu-awakening', () => {
  const lookups = buildPieceLookups(normalizePieceCatalog(catalog));

  it('detects ally spring on board', () => {
    const pieces = [
      { side: 'player' as const, char: '泉', row: 0, col: 0 },
      { side: 'enemy' as const, char: '泉', row: 1, col: 1 },
    ];
    expect(hasAllySpringPieceOnBoard(pieces, 'player')).toBe(true);
    expect(hasAllySpringPieceOnBoard(pieces, 'enemy')).toBe(true);
    expect(
      hasAllySpringPieceOnBoard([{ side: 'player', char: '歩', row: 0, col: 0 }], 'player'),
    ).toBe(false);
  });

  it('maps small dragon for rules to tatsu when spring is ally', () => {
    const pieces = [
      { side: 'player', char: '泉', row: 0, col: 0, pieceCode: 'SPRING', promoted: false },
      { side: 'player', char: '竜', row: 4, col: 4, pieceCode: 'RYU', promoted: false },
    ];
    const ryu = pieces[1]!;
    const eff = effectivePieceForRulesAfterSpring(ryu as never, pieces as never, lookups);
    expect(eff.pieceCode).toBe('TATSU');
    expect(eff.char).toBe('辰');
  });

  it('does not awaken without spring', () => {
    const pieces = [
      { side: 'player', char: '竜', row: 4, col: 4, pieceCode: 'RYU', promoted: false },
    ];
    const eff = effectivePieceForRulesAfterSpring(pieces[0] as never, pieces as never, lookups);
    expect(eff.pieceCode).toBe('RYU');
    expect(eff.char).toBe('竜');
  });

  it('isUnpromotedSmallDragonPiece matches RYU and 竜', () => {
    expect(isUnpromotedSmallDragonPiece({ char: '竜', pieceCode: 'X', promoted: false })).toBe(
      true,
    );
    expect(isUnpromotedSmallDragonPiece({ char: '飛', pieceCode: 'RYU', promoted: false })).toBe(
      true,
    );
    expect(isUnpromotedSmallDragonPiece({ char: '竜', pieceCode: 'RYU', promoted: true })).toBe(
      false,
    );
  });

  it('display mapper sets char 辰, tatsu pieceCode, and image', () => {
    const out = mapPiecesForSpringDragonAwakeningDisplay(
      [
        {
          side: 'player',
          char: '泉',
          pieceCode: 'SPRING',
          promoted: false,
          imageSignedUrl: null,
        },
        {
          side: 'player',
          char: '竜',
          pieceCode: 'RYU',
          promoted: false,
          imageSignedUrl: 'old',
        },
      ],
      { 辰: { pieceCode: 'TATSU', imageSignedUrl: 'tatsu.png' } },
    );
    expect(out[1]?.char).toBe('辰');
    expect(out[1]?.pieceCode).toBe('TATSU');
    expect(out[1]?.imageSignedUrl).toBe('tatsu.png');
  });
});
