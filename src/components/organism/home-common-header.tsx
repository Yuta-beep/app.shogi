import { View } from 'react-native';

import { CurrencyStack } from '@/components/molecule/currency-stack';
import { PlayerStatus } from '@/components/molecule/player-status';

type HomeCommonHeaderProps = {
  userName: string;
  rank?: number;
  exp?: number;
  pawnCurrency?: number;
  goldCurrency?: number;
  stamina?: number;
  maxStamina?: number;
};

const MOCK_EXP_PER_LEVEL = 1000;

export function HomeCommonHeader({
  userName,
  rank = 1,
  exp = 0,
  pawnCurrency = 0,
  goldCurrency = 0,
  stamina = 50,
  maxStamina = 50,
}: HomeCommonHeaderProps) {
  return (
    <View className="w-full">
      <View
        className="relative h-[78px] flex-row items-center justify-between overflow-visible border-y-2 border-[#b88a3b] bg-[#e5cfa7] px-4"
        style={{
          shadowColor: 'rgba(49,27,17,0.28)',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 1,
          shadowRadius: 14,
          elevation: 7,
        }}
      >
        <View className="absolute inset-[4px] border border-[rgba(120,80,30,0.28)]" />
        <View className="absolute bottom-[-7px] left-1/2 h-[14px] w-[14px] -translate-x-1/2 rotate-45 border-b border-r border-[#8e6428] bg-[#d2a860]" />

        <PlayerStatus
          userName={userName}
          rank={rank}
          exp={exp}
          expPerLevel={MOCK_EXP_PER_LEVEL}
          stamina={stamina}
          maxStamina={maxStamina}
        />
        <CurrencyStack pawnCurrency={pawnCurrency} goldCurrency={goldCurrency} />
      </View>
    </View>
  );
}
