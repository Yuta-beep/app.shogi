import { Asset } from 'expo-asset';
import { useEffect, useMemo, useState } from 'react';

export type UseAssetPreloadResult = {
  isReady: boolean;
  error: Error | null;
};

export function useAssetPreload(assetModules: number[]): UseAssetPreloadResult {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const targets = useMemo(() => assetModules.filter(Boolean), [assetModules]);

  useEffect(() => {
    let active = true;

    async function preload() {
      try {
        await Promise.all(targets.map((asset) => Asset.fromModule(asset).downloadAsync()));
        if (active) {
          setIsReady(true);
        }
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e : new Error('Asset preload failed'));
          setIsReady(true);
        }
      }
    }

    preload();

    return () => {
      active = false;
    };
  }, [targets]);

  return { isReady, error };
}
