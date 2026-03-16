import { renderHook, waitFor } from '@testing-library/react-native';
import { Asset } from 'expo-asset';
import { Image } from 'expo-image';

import { useAssetPreload } from '@/hooks/common/use-asset-preload';

jest.mock('expo-asset', () => ({
  Asset: {
    fromModule: jest.fn(),
  },
}));

jest.mock('expo-image', () => ({
  Image: {
    prefetch: jest.fn(),
  },
}));

describe('useAssetPreload', () => {
  beforeEach(() => {
    jest.mocked(Image.prefetch).mockResolvedValue(true);
  });

  it('marks ready when all assets are downloaded', async () => {
    const downloadAsync = jest.fn().mockResolvedValue(undefined);
    const fromModule = jest.mocked(Asset.fromModule);
    fromModule.mockReturnValue({ downloadAsync, localUri: 'file://asset.png' } as never);

    const { result } = renderHook(() => useAssetPreload([1, 2, 0]));

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    expect(result.current.error).toBeNull();
    expect(fromModule).toHaveBeenCalledWith(1);
    expect(fromModule).toHaveBeenCalledWith(2);
    expect(downloadAsync).toHaveBeenCalled();
    expect(Image.prefetch).toHaveBeenCalledWith(['file://asset.png', 'file://asset.png']);
  });

  it('stores error and still marks ready when preload fails', async () => {
    const failure = new Error('download failed');
    const downloadAsync = jest.fn().mockRejectedValue(failure);
    const fromModule = jest.mocked(Asset.fromModule);
    fromModule.mockReturnValue({ downloadAsync } as never);

    const { result } = renderHook(() => useAssetPreload([99]));

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    expect(result.current.error).toEqual(failure);
  });

  it('prefetches remote urls too', async () => {
    const fromModule = jest.mocked(Asset.fromModule);
    fromModule.mockReturnValue({
      downloadAsync: jest.fn().mockResolvedValue(undefined),
      localUri: 'file://local.png',
    } as never);

    const { result } = renderHook(() =>
      useAssetPreload([1, 'https://example.com/a.png', null, undefined, '']),
    );

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    expect(Image.prefetch).toHaveBeenCalledWith(['file://local.png', 'https://example.com/a.png']);
  });

  it('keeps ready true when targets change after initial load', async () => {
    const fromModule = jest.mocked(Asset.fromModule);
    fromModule.mockReturnValue({
      downloadAsync: jest.fn().mockResolvedValue(undefined),
      localUri: 'file://local.png',
    } as never);

    const { result, rerender } = renderHook<
      ReturnType<typeof useAssetPreload>,
      { targets: (number | string)[] }
    >(({ targets }) => useAssetPreload(targets), {
      initialProps: { targets: [1] },
    });

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    rerender({ targets: [1, 'https://example.com/new.png'] });
    expect(result.current.isReady).toBe(true);
  });

  it('re-enters loading when blockOnTargetChange is enabled', async () => {
    const fromModule = jest.mocked(Asset.fromModule);
    fromModule.mockReturnValue({
      downloadAsync: jest.fn().mockResolvedValue(undefined),
      localUri: 'file://local.png',
    } as never);

    const { result, rerender } = renderHook<
      ReturnType<typeof useAssetPreload>,
      { targets: (number | string)[] }
    >(({ targets }) => useAssetPreload(targets, { blockOnTargetChange: true }), {
      initialProps: { targets: [1] },
    });

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    rerender({ targets: [1, 'https://example.com/new.png'] });
    expect(result.current.isReady).toBe(false);

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });
  });

  it('waits while disabled and starts preloading when enabled', async () => {
    const fromModule = jest.mocked(Asset.fromModule);
    fromModule.mockReturnValue({
      downloadAsync: jest.fn().mockResolvedValue(undefined),
      localUri: 'file://local.png',
    } as never);

    const { result, rerender } = renderHook<
      ReturnType<typeof useAssetPreload>,
      { enabled: boolean }
    >(({ enabled }) => useAssetPreload([1], { enabled }), {
      initialProps: { enabled: false },
    });

    expect(result.current.isReady).toBe(false);

    rerender({ enabled: true });
    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });
  });
});
