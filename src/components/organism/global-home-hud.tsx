import { SafeAreaView } from 'react-native-safe-area-context';

import { EditableHomeCommonHeader } from '@/components/organism/editable-home-common-header';
import { useHomeHudSnapshot } from '@/hooks/common/use-home-hud-snapshot';

type GlobalHomeHudProps = {
  pawnCurrency?: number;
  goldCurrency?: number;
};

export function GlobalHomeHud({ pawnCurrency, goldCurrency }: GlobalHomeHudProps) {
  const snapshot = useHomeHudSnapshot();

  return (
    <>
      <SafeAreaView edges={['top']} />
      <EditableHomeCommonHeader
        userName={snapshot.playerName}
        rank={snapshot.playerRank}
        exp={snapshot.playerExp}
        pawnCurrency={pawnCurrency ?? snapshot.pawnCurrency}
        goldCurrency={goldCurrency ?? snapshot.goldCurrency}
        stamina={snapshot.stamina}
        maxStamina={snapshot.maxStamina}
        nextRecoveryAt={snapshot.nextRecoveryAt}
      />
    </>
  );
}
