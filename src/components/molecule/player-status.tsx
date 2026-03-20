import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { ExpProgressBar } from '@/components/atom/exp-progress-bar';
import { HeaderLabel } from '@/components/atom/header-label';

type PlayerStatusProps = {
  userName: string;
  rank: number;
  exp: number;
  expPerLevel: number;
  stamina?: number;
  maxStamina?: number;
  nextRecoveryAt?: string | null;
};

function useCountdown(nextRecoveryAt?: string | null): string | null {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!nextRecoveryAt) {
      setLabel(null);
      return;
    }

    function tick() {
      const diff = new Date(nextRecoveryAt!).getTime() - Date.now();
      if (diff <= 0) {
        setLabel('00:00');
        return;
      }
      const totalSec = Math.ceil(diff / 1000);
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      setLabel(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [nextRecoveryAt]);

  return label;
}

export function PlayerStatus({
  userName,
  rank,
  exp,
  expPerLevel,
  stamina = 50,
  maxStamina = 50,
  nextRecoveryAt,
}: PlayerStatusProps) {
  const normalizedExp = Math.max(0, exp);
  const progress = expPerLevel > 0 ? normalizedExp / expPerLevel : 0;
  const staminaCurrent = Math.max(0, stamina);
  const staminaMax = Math.max(1, maxStamina);
  const staminaProgress = staminaCurrent / staminaMax;
  const countdown = useCountdown(staminaCurrent < staminaMax ? nextRecoveryAt : null);

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
            {countdown !== null && (
              <Text className="ml-1 text-[9px] font-black text-[#7a5c3a]">{`+5 ${countdown}`}</Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}
