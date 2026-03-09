import { useEffect, useMemo, useState } from 'react';

import { useModalState } from '@/hooks/common/use-modal-state';
import { createLoadShopCatalogUseCase, createPurchaseShopItemUseCase } from '@/infra/di/usecase-factory';
import { ShopItem } from '@/usecases/piece-shop/load-shop-catalog-usecase';

export type PieceShopVM = {
  isLoading: boolean;
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
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<ShopItem[]>([]);
  const [pawnCurrency, setPawnCurrency] = useState(0);
  const [goldCurrency, setGoldCurrency] = useState(0);
  const [owned, setOwned] = useState<ShopItem['key'][]>([]);

  const detail = useModalState<ShopItem>();
  const confirm = useModalState<ShopItem>();

  const loadUseCase = useMemo(() => createLoadShopCatalogUseCase(), []);
  const purchaseUseCase = useMemo(() => createPurchaseShopItemUseCase(), []);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    loadUseCase
      .execute()
      .then((snapshot) => {
        if (!active) return;
        setItems(snapshot.items);
        setPawnCurrency(snapshot.pawnCurrency);
        setGoldCurrency(snapshot.goldCurrency);
        setOwned(snapshot.owned);
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [loadUseCase]);

  async function purchase() {
    if (!confirm.payload) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await purchaseUseCase.execute({ item: confirm.payload });
      if (result.success || result.reason === 'UI_ONLY') {
        setOwned((prev) => (prev.includes(confirm.payload!.key) ? prev : [...prev, confirm.payload!.key]));
      }
    } finally {
      setIsLoading(false);
    }
    confirm.close();
  }

  return {
    isLoading,
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
