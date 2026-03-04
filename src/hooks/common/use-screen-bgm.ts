import { useEffect } from 'react';

import { BgmTrack } from '@/constants/audio-assets';
import { playBgm, stopBgm } from '@/lib/audio/audio-manager';

export function useScreenBgm(track: BgmTrack) {
  useEffect(() => {
    void playBgm(track);
    return () => {
      stopBgm(track);
    };
  }, [track]);
}

