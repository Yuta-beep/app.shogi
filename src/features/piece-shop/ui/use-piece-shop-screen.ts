import { useEffect, useMemo, useState } from 'react';

import { useModalState } from '@/hooks/common/use-modal-state';
import { MockLoadShopCatalogUseCase, MockPurchaseShopItemUseCase } from '@/usecases/piece-shop/mock-piece-shop-usecases';
import { ShopItem } from '@/usecases/piece-shop/load-shop-catalog-usecase';

export type PieceShopVM = {
  items: ShopItem[];
  pawnCurrency: number;
  goldCurrency: number;
  owned: ShopItem['key'][];
  detailPiece: ShopItem | null;
  confirmPiece: ShopItem | null;
  openDetail: (piece: ShopItem) => void;
  openConfirm: (piece: ShopItem) => void;
  closeDetail: () => void;
  closeConfirm: () => void;
  purchase: () => Promise<void>;
};

export function usePieceShopScreen(): PieceShopVM {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [pawnCurrency, setPawnCurrency] = useState(0);
  const [goldCurrency, setGoldCurrency] = useState(0);
  const [owned, setOwned] = useState<ShopItem['key'][]>([]);

  const detail = useModalState<ShopItem>();
  const confirm = useModalState<ShopItem>();

  const loadUseCase = useMemo(() => new MockLoadShopCatalogUseCase(), []);
  const purchaseUseCase = useMemo(() => new MockPurchaseShopItemUseCase(), []);

  useEffect(() => {
    let active = true;
    loadUseCase.execute().then((snapshot) => {
      if (!active) return;
      setItems(snapshot.items);
      setPawnCurrency(snapshot.pawnCurrency);
      setGoldCurrency(snapshot.goldCurrency);
      setOwned(snapshot.owned);
    });
    return () => {
      active = false;
    };
  }, [loadUseCase]);

  async function purchase() {
    if (!confirm.payload) {
      return;
    }
    await purchaseUseCase.execute({ item: confirm.payload });
    setOwned((prev) => (prev.includes(confirm.payload!.key) ? prev : [...prev, confirm.payload!.key]));
    confirm.close();
  }

  return {
    items,
    pawnCurrency,
    goldCurrency,
    owned,
    detailPiece: detail.payload,
    confirmPiece: confirm.payload,
    openDetail: detail.open,
    openConfirm: confirm.open,
    closeDetail: detail.close,
    closeConfirm: confirm.close,
    purchase,
  };
}
