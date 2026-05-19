import {
  applyPieceShopMockPurchase,
  getPieceShopMockSnapshot,
} from '@/features/piece-shop/lib/piece-shop-mock-store';
import {
  LoadShopCatalogUseCase,
  ShopCatalogSnapshot,
} from '@/usecases/piece-shop/load-shop-catalog-usecase';
import {
  PurchaseShopItemInput,
  PurchaseShopItemResult,
  PurchaseShopItemUseCase,
} from '@/usecases/piece-shop/purchase-shop-item-usecase';

const items: ShopCatalogSnapshot['items'] = [
  {
    key: '走',
    desc: 'なし',
    move: '前方に最大2マス進める。1マス目に駒がある場合は2マス目には進めない。',
    cost: 2,
    costType: 'pawn',
  },
  {
    key: '種',
    desc: '移動時20%の確率で、周囲8マスのランダムな空きマス1マスに「葉」駒を召喚する。',
    move: '前斜め4方向に1マス移動できる。',
    cost: 3,
    costType: 'gold',
  },
  {
    key: '麒',
    desc: '「金」「銀」「歩」駒から取られない。',
    move: '前後左右に何マスでも進める。斜め4方向に1マス進める。',
    cost: 20,
    costType: 'gold',
  },
  {
    key: '舞',
    desc: '移動時、その時点で周囲8マスにいる敵駒の移動範囲を斜め前1マスのみに制限する。',
    move: '前・前斜め左右・左右・後に各1マス進める。',
    cost: 6,
    costType: 'gold',
  },
  {
    key: 'P',
    desc: '同じ行または同じ列にいる敵駒を移動不能にする（「王」「巨」は除く）。',
    move: '縦横1マス',
    cost: 40,
    costType: 'gold',
  },
  {
    key: '鳴',
    desc: '敵駒を取ったとき、同じ敵駒があと2体以上いれば合計3体までまとめて取る（ポン）。',
    move: '銀と同じ',
    cost: 50,
    costType: 'pawn',
  },
];

const SHOP_MOCK_PIECE_IDS: Record<(typeof items)[number]['key'], number> = {
  走: 9001,
  種: 9002,
  麒: 9003,
  舞: 9004,
  P: 9005,
  鳴: 9006,
};

export class MockLoadShopCatalogUseCase implements LoadShopCatalogUseCase {
  async execute(): Promise<ShopCatalogSnapshot> {
    const wallet = getPieceShopMockSnapshot();
    return {
      items,
      pawnCurrency: wallet.pawnCurrency,
      goldCurrency: wallet.goldCurrency,
      owned: wallet.owned,
    };
  }
}

export class MockPurchaseShopItemUseCase implements PurchaseShopItemUseCase {
  async execute(input: PurchaseShopItemInput): Promise<PurchaseShopItemResult> {
    const target = input.item;
    const before = getPieceShopMockSnapshot();
    if (before.owned.includes(target.key)) {
      return { success: false, reason: 'UI_ONLY' };
    }

    const costPawn = target.costType === 'pawn' ? target.cost : 0;
    const costGold = target.costType === 'gold' ? target.cost : 0;
    if (before.pawnCurrency < costPawn || before.goldCurrency < costGold) {
      return { success: false, reason: 'UI_ONLY' };
    }

    const next = applyPieceShopMockPurchase(target);
    return {
      success: true,
      itemKey: target.key,
      pawnCurrency: next.pawnCurrency,
      goldCurrency: next.goldCurrency,
      owned: next.owned,
      grantedPieceId: SHOP_MOCK_PIECE_IDS[target.key],
      alreadyOwned: false,
    };
  }
}
