import { Asset } from 'expo-asset';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';

export type UseAssetPreloadResult = {
  isReady: boolean;
  error: Error | null;
};

type PreloadTarget = number | string | null | undefined;
type UseAssetPreloadOptions = {
  blockOnTargetChange?: boolean;
  initialSettleMs?: number;
  enabled?: boolean;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeTargets(assetModules: readonly PreloadTarget[]) {
  const targets: (number | string)[] = [];
  for (const target of assetModules) {
    if (typeof target === 'number' && target > 0) {
      targets.push(target);
      continue;
    }
    if (isNonEmptyString(target)) {
      targets.push(target);
    }
  }
  const key = targets
    .map((target) => (typeof target === 'number' ? `n:${target}` : `s:${target}`))
    .join('|');
  return { key, targets };
}

export function useAssetPreload(
  assetModules: readonly PreloadTarget[],
  options?: UseAssetPreloadOptions,
): UseAssetPreloadResult {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const hasCompletedInitialPreloadRef = useRef(false);
  const blockOnTargetChange = options?.blockOnTargetChange ?? false;
  const initialSettleMs = options?.initialSettleMs ?? 250;
  const enabled = options?.enabled ?? true;
  const normalizedTargets = normalizeTargets(assetModules);
  const stableTargetsRef = useRef(normalizedTargets);
  if (stableTargetsRef.current.key !== normalizedTargets.key) {
    stableTargetsRef.current = normalizedTargets;
  }
  const targetsKey = stableTargetsRef.current.key;

  useEffect(() => {
    const targets = stableTargetsRef.current.targets;
    if (!enabled) {
      if (!hasCompletedInitialPreloadRef.current) {
        setIsReady(false);
      }
      return () => undefined;
    }

    let active = true;

    async function preload() {
      if (active) {
        setError(null);
        if (!hasCompletedInitialPreloadRef.current || blockOnTargetChange) {
          setIsReady(false);
        }
      }

      try {
        const localAssetTargets = targets.filter(
          (target): target is number => typeof target === 'number',
        );
        const remoteUrlTargets = targets.filter(isNonEmptyString);

        const downloadedAssets = await Promise.all(
          localAssetTargets.map(async (assetModule) => {
            const asset = Asset.fromModule(assetModule);
            await asset.downloadAsync();
            return asset;
          }),
        );

        const preloadUrls = [
          ...downloadedAssets
            .map((asset) => asset.localUri ?? asset.uri ?? null)
            .filter(isNonEmptyString),
          ...remoteUrlTargets,
        ];

        if (preloadUrls.length > 0) {
          await Image.prefetch(preloadUrls);
        }

        if (!hasCompletedInitialPreloadRef.current && initialSettleMs > 0) {
          await new Promise((resolve) => {
            setTimeout(resolve, initialSettleMs);
          });
          if (!active) return;
        }

        if (active) {
          setIsReady(true);
          hasCompletedInitialPreloadRef.current = true;
        }
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e : new Error('Asset preload failed'));
          setIsReady(true);
          hasCompletedInitialPreloadRef.current = true;
        }
      }
    }

    preload();

    return () => {
      active = false;
    };
  }, [blockOnTargetChange, enabled, initialSettleMs, targetsKey]);

  return { isReady, error };
}
