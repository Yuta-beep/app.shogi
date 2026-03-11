import { Text, View } from 'react-native';

import { ExpProgressBar } from '@/components/atom/exp-progress-bar';
import { HeaderLabel } from '@/components/atom/header-label';

type PlayerStatusProps = {
  userName: string;
  rank: number;
  exp: number;
  expPerLevel: number;
};

export function PlayerStatus({ userName, rank, exp, expPerLevel }: PlayerStatusProps) {
  const normalizedExp = Math.max(0, exp);
  const progress = expPerLevel > 0 ? normalizedExp / expPerLevel : 0;
  const staminaCurrent = 50;
  const staminaMax = 50;
  const staminaProgress = staminaMax > 0 ? staminaCurrent / staminaMax : 0;

  return (
    <View className="mr-3 flex-1 pr-2">
      <HeaderLabel text={userName} />
      <View className="mt-2 flex-row items-center">
        <View className="flex-1 gap-1">
          <View className="flex-row items-center">
            <View className="w-36">
              <ExpProgressBar progress={progress} />
            </View>
            <Text className="ml-2 text-[11px] font-black text-[#4b2e1f]">{`EXP ${normalizedExp}`}</Text>
            <Text className="ml-2 text-[12px] font-black text-[#4b2e1f]">{`RANK ${rank}`}</Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-36">
              <ExpProgressBar progress={staminaProgress} fillClassName="bg-[#6bb6ff]" />
            </View>
            <Text className="ml-2 text-[10px] font-black text-[#4b2e1f]">{`スタミナ ${staminaCurrent}/${staminaMax}`}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
