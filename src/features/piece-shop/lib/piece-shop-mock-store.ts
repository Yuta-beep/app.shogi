import type { ShopCatalogSnapshot, ShopItem } from '@/domain/models/shop';

const SHOP_MOCK_PIECE_IDS: Record<ShopItem['key'], number> = {
  走: 9001,
  種: 9002,
  麒: 9003,
  舞: 9004,
  P: 9005,
  鳴: 9006,
};

type PieceShopMockState = {
  pawnCurrency: number;
  goldCurrency: number;
  owned: ShopItem['key'][];
};

let state: PieceShopMockState = {
  pawnCurrency: 100,
  goldCurrency: 100,
  owned: [],
};

export function getPieceShopMockSnapshot(): Pick<
  ShopCatalogSnapshot,
  'pawnCurrency' | 'goldCurrency' | 'owned'
> {
  return {
    pawnCurrency: state.pawnCurrency,
    goldCurrency: state.goldCurrency,
    owned: [...state.owned],
  };
}

export function applyPieceShopMockPurchase(item: ShopItem): PieceShopMockState {
  if (state.owned.includes(item.key)) {
    return { ...state, owned: [...state.owned] };
  }

  const nextPawn =
    item.costType === 'pawn' ? Math.max(0, state.pawnCurrency - item.cost) : state.pawnCurrency;
  const nextGold =
    item.costType === 'gold' ? Math.max(0, state.goldCurrency - item.cost) : state.goldCurrency;

  state = {
    pawnCurrency: nextPawn,
    goldCurrency: nextGold,
    owned: [...state.owned, item.key],
  };

  return { ...state, owned: [...state.owned] };
}

export function getPieceShopMockOwnedPiecesForDeckBuilder() {
  const catalogItems: { key: ShopItem['key']; desc: string; move: string }[] = [
    {
      key: '走',
      desc: 'なし',
      move: '前方に最大2マス進める。1マス目に駒がある場合は2マス目には進めない。',
    },
    {
      key: '種',
      desc: '移動時20%の確率で、周囲8マスのランダムな空きマス1マスに「葉」駒を召喚する。',
      move: '前斜め4方向に1マス移動できる。',
    },
    {
      key: '麒',
      desc: '「金」「銀」「歩」駒から取られない。',
      move: '前後左右に何マスでも進める。斜め4方向に1マス進める。',
    },
    {
      key: '舞',
      desc: '移動時、その時点で周囲8マスにいる敵駒の移動範囲を斜め前1マスのみに制限する。',
      move: '前・前斜め左右・左右・後に各1マス進める。',
    },
    {
      key: 'P',
      desc: '同じ行または同じ列にいる敵駒を移動不能にする（「王」「巨」は除く）。',
      move: '縦横1マス',
    },
    {
      key: '鳴',
      desc: '敵駒を取ったとき、同じ敵駒があと2体以上いれば合計3体までまとめて取る（ポン）。',
      move: '銀と同じ',
    },
  ];

  return state.owned
    .slice()
    .reverse()
    .map((key) => {
      const meta = catalogItems.find((item) => item.key === key);
      return {
        pieceId: SHOP_MOCK_PIECE_IDS[key],
        char: key,
        name: key,
        source: 'shop',
        acquiredAt: new Date().toISOString(),
        desc: meta?.desc ?? '',
        skill: meta?.desc ?? '',
        move: meta?.move ?? '',
      };
    });
}
