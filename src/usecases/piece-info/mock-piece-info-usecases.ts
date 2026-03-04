import { LoadPieceCatalogUseCase, PieceCatalogItem } from '@/usecases/piece-info/load-piece-catalog-usecase';

const pieceCatalog: PieceCatalogItem[] = [
  { char: '香', name: '香車', unlock: '初期', desc: '直線的な攻撃力が高い。', skill: 'なし', move: '前方に何マスでも移動' },
  { char: '桂', name: '桂馬', unlock: '初期', desc: '他の駒を飛び越える。', skill: 'なし', move: '前方2マス+横1マス' },
  { char: '銀', name: '銀将', unlock: '初期', desc: '防御力に優れた普通駒。', skill: 'なし', move: '斜め4方向+前' },
  { char: '忍', name: '忍者', unlock: 'Stage 2', desc: '機動力に優れる特殊駒。', skill: 'なし', move: '桂+銀の複合' },
  { char: '竜', name: '小竜', unlock: 'Stage 4', desc: '覚醒前の竜駒。', skill: '「泉」で覚醒して辰になる', move: '前後左右2マス' },
];

export class MockLoadPieceCatalogUseCase implements LoadPieceCatalogUseCase {
  async execute(): Promise<PieceCatalogItem[]> {
    return pieceCatalog;
  }
}
