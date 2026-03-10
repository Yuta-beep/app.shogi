import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { BgmTrack } from '@/constants/audio-assets';
import { playBgm, stopBgm } from '@/lib/audio/audio-manager';

export function useScreenBgm(track: BgmTrack) {
  useFocusEffect(
    useCallback(() => {
      void playBgm(track);

      return () => {
        stopBgm(track);
      };
    }, [track]),
  );
}
