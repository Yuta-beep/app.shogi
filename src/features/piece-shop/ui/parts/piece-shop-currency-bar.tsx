import { CurrencyStack } from '@/components/molecule/currency-stack';

const PIECE_SHOP_CURRENCY_VALUE_CLASS = 'text-[14px] font-black text-white';

type PieceShopCurrencyBarProps = {
  pawnCurrency: number;
  goldCurrency: number;
};

export function PieceShopCurrencyBar({ pawnCurrency, goldCurrency }: PieceShopCurrencyBarProps) {
  return (
    <CurrencyStack
      pawnCurrency={pawnCurrency}
      goldCurrency={goldCurrency}
      layout="row"
      align="start"
      valueClassName={PIECE_SHOP_CURRENCY_VALUE_CLASS}
    />
  );
}
