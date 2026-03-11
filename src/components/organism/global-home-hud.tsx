import { SafeAreaView } from 'react-native-safe-area-context';

import { HomeCommonHeader } from '@/components/organism/home-common-header';
import { useHomeHudSnapshot } from '@/hooks/common/use-home-hud-snapshot';

export function GlobalHomeHud() {
  const snapshot = useHomeHudSnapshot();

  return (
    <>
      <SafeAreaView edges={['top']} className="bg-black" />
      <HomeCommonHeader
        userName={snapshot.playerName}
        rank={snapshot.playerRank}
        exp={snapshot.playerExp}
        pawnCurrency={snapshot.pawnCurrency}
        goldCurrency={snapshot.goldCurrency}
      />
    </>
  );
}
