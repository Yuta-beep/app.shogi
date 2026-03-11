import { View } from 'react-native';

import { CurrencyChip } from '@/components/atom/currency-chip';

type CurrencyStackProps = {
  pawnCurrency: number;
  goldCurrency: number;
};

export function CurrencyStack({ pawnCurrency, goldCurrency }: CurrencyStackProps) {
  return (
    <View className="min-w-[120px] flex-row items-center justify-end gap-3">
      <CurrencyChip label="歩" value={pawnCurrency} />
      <CurrencyChip label="金" value={goldCurrency} />
    </View>
  );
}
