import { View } from 'react-native';

import { CurrencyChip } from '@/components/atom/currency-chip';

type CurrencyStackProps = {
  pawnCurrency: number;
  goldCurrency: number;
  layout?: 'row' | 'column';
  /** column 時の横寄せ（左配置なら start） */
  align?: 'start' | 'end';
  valueClassName?: string;
};

const pawnPieceCoinIcon = require('../../../assets/home/ui/hoPieceCoin.png');
const goldPieceCoinIcon = require('../../../assets/home/ui/KinPieceCoin.png');

export function CurrencyStack({
  pawnCurrency,
  goldCurrency,
  layout = 'row',
  align = 'end',
  valueClassName,
}: CurrencyStackProps) {
  const isColumn = layout === 'column';
  const alignClass = align === 'start' ? 'items-start' : 'items-end';

  return (
    <View className={`min-w-[120px] ${alignClass} ${isColumn ? 'gap-2' : 'flex-row gap-3'}`}>
      <CurrencyChip
        iconSource={pawnPieceCoinIcon}
        value={pawnCurrency}
        valueClassName={valueClassName}
      />
      <CurrencyChip
        iconSource={goldPieceCoinIcon}
        value={goldCurrency}
        valueClassName={valueClassName}
      />
    </View>
  );
}
