import { renderHook, waitFor } from '@testing-library/react-native';
import { Asset } from 'expo-asset';

import { useAssetPreload } from '@/hooks/common/use-asset-preload';

jest.mock('expo-asset', () => ({
  Asset: {
    fromModule: jest.fn(),
  },
}));

describe('useAssetPreload', () => {
  it('marks ready when all assets are downloaded', async () => {
    const downloadAsync = jest.fn().mockResolvedValue(undefined);
    const fromModule = jest.mocked(Asset.fromModule);
    fromModule.mockReturnValue({ downloadAsync } as never);

    const { result } = renderHook(() => useAssetPreload([1, 2, 0]));

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    expect(result.current.error).toBeNull();
    expect(fromModule).toHaveBeenCalledWith(1);
    expect(fromModule).toHaveBeenCalledWith(2);
    expect(downloadAsync).toHaveBeenCalled();
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
});
