import { View } from 'react-native';

import { CurrencyChip } from '@/components/atom/currency-chip';

type CurrencyStackProps = {
  pawnCurrency: number;
  goldCurrency: number;
};

const pawnPieceCoinIcon = require('../../../assets/home/ui/hoPieceCoin.png');
const goldPieceCoinIcon = require('../../../assets/home/ui/KinPieceCoin.png');

export function CurrencyStack({ pawnCurrency, goldCurrency }: CurrencyStackProps) {
  return (
    <View className="min-w-[120px] flex-row items-center justify-end gap-3">
      <CurrencyChip iconSource={pawnPieceCoinIcon} value={pawnCurrency} />
      <CurrencyChip iconSource={goldPieceCoinIcon} value={goldCurrency} />
    </View>
  );
}
