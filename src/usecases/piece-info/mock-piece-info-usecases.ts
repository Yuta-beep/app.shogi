import { buildGachaPieceCatalogItems } from '@/constants/gacha-piece-metadata';
import { normalizePieceCatalogItemForDisplay } from '@/features/piece-info/lib/piece-catalog-display';
import {
  LoadPieceCatalogUseCase,
  PieceCatalogItem,
} from '@/usecases/piece-info/load-piece-catalog-usecase';

const basePieceCatalog: PieceCatalogItem[] = [
  {
    char: '香',
    name: '香車',
    unlock: '初期',
    desc: '直線的な攻撃力が高い。',
    skill: 'なし',
    move: '前方直線移動',
    moveVectors: [{ dx: 0, dy: -1, maxStep: 8 }],
    isRepeatable: true,
  },
  {
    char: '桂',
    name: '桂馬',
    unlock: '初期',
    desc: '他の駒を飛び越える。',
    skill: 'なし',
    move: '前方2マス+横1マス',
    moveVectors: [
      { dx: -1, dy: -2, maxStep: 1 },
      { dx: 1, dy: -2, maxStep: 1 },
    ],
    isRepeatable: false,
  },
  {
    char: '銀',
    name: '銀将',
    unlock: '初期',
    desc: '防御力に優れた駒。',
    skill: 'なし',
    move: '斜め4方向+前',
    moveVectors: [
      { dx: -1, dy: -1, maxStep: 1 },
      { dx: 0, dy: -1, maxStep: 1 },
      { dx: 1, dy: -1, maxStep: 1 },
      { dx: -1, dy: 1, maxStep: 1 },
      { dx: 1, dy: 1, maxStep: 1 },
    ],
    isRepeatable: false,
  },
  {
    char: '忍',
    name: '忍者',
    unlock: 'Stage 2',
    desc: '機動力に優れる特殊駒。',
    skill: '桂馬と銀将の複合移動',
    move: '桂+銀の複合',
    moveVectors: [
      { dx: -1, dy: -2, maxStep: 1 },
      { dx: 1, dy: -2, maxStep: 1 },
      { dx: -1, dy: -1, maxStep: 1 },
      { dx: 0, dy: -1, maxStep: 1 },
      { dx: 1, dy: -1, maxStep: 1 },
      { dx: -1, dy: 1, maxStep: 1 },
      { dx: 1, dy: 1, maxStep: 1 },
    ],
    isRepeatable: false,
  },
  {
    char: '泉',
    pieceCode: 'SPRING',
    sfenCode: 'ZQN',
    name: '泉',
    unlock: 'Stage 29',
    desc: '竜を覚醒させる。',
    skill: '味方の「竜」駒を覚醒させる。',
    move: '上下左右1マス',
    moveVectors: [
      { dx: 0, dy: -1, maxStep: 1 },
      { dx: 0, dy: 1, maxStep: 1 },
      { dx: -1, dy: 0, maxStep: 1 },
      { dx: 1, dy: 0, maxStep: 1 },
    ],
    isRepeatable: false,
  },
  {
    char: '辰',
    pieceCode: 'TATSU',
    sfenCode: 'ZTS',
    name: '辰神',
    unlock: 'Stage 29',
    desc: '泉により覚醒した竜。',
    skill: '移動時10％の確率で周囲8マスの敵駒を1つ消滅させる。',
    move: '前後左右3マス',
    moveVectors: [
      { dx: 0, dy: -1, maxStep: 3 },
      { dx: 0, dy: 1, maxStep: 3 },
      { dx: -1, dy: 0, maxStep: 3 },
      { dx: 1, dy: 0, maxStep: 3 },
    ],
    isRepeatable: false,
  },
  {
    char: '竜',
    pieceCode: 'RYU',
    sfenCode: 'F',
    name: '小竜',
    unlock: 'Stage 4',
    desc: '覚醒前の竜駒。',
    skill: '味方に泉が盤にいる間、辰として行動する。',
    move: '前後左右2マス',
    moveVectors: [
      { dx: 0, dy: -1, maxStep: 2 },
      { dx: 0, dy: 1, maxStep: 2 },
      { dx: -1, dy: 0, maxStep: 2 },
      { dx: 1, dy: 0, maxStep: 2 },
    ],
    isRepeatable: false,
  },
];

const pieceCatalog: PieceCatalogItem[] = [...basePieceCatalog, ...buildGachaPieceCatalogItems()];

export class MockLoadPieceCatalogUseCase implements LoadPieceCatalogUseCase {
  async execute(): Promise<PieceCatalogItem[]> {
    return pieceCatalog.map((item) => normalizePieceCatalogItemForDisplay(item));
  }
}
