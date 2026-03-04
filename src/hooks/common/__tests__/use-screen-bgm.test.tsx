import { renderHook, waitFor } from '@testing-library/react-native';

import { useScreenBgm } from '@/hooks/common/use-screen-bgm';
import { playBgm, stopBgm } from '@/lib/audio/audio-manager';

jest.mock('@/lib/audio/audio-manager', () => ({
  playBgm: jest.fn().mockResolvedValue(undefined),
  stopBgm: jest.fn(),
}));

describe('useScreenBgm', () => {
  it('plays BGM on mount and stops on unmount', async () => {
    const { unmount } = renderHook(() => useScreenBgm('home'));

    await waitFor(() => {
      expect(playBgm).toHaveBeenCalledWith('home');
    });

    unmount();

    expect(stopBgm).toHaveBeenCalledWith('home');
  });
});

