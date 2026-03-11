import { render, waitFor } from '@testing-library/react-native';
import RootLayout from '@/app/_layout';

jest.mock('../../../global.css', () => ({}));

const mockReplace = jest.fn();
const mockReleaseAudioPlayers = jest.fn();
const mockUseAuthSession = jest.fn();

jest.mock('expo-router', () => {
  return {
    Stack: () => {
      const { Text } = jest.requireActual('react-native');
      return <Text testID="stack">stack</Text>;
    },
    useRouter: () => ({
      replace: (...args: unknown[]) => mockReplace(...args),
    }),
  };
});

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

jest.mock('@/components/organism/app-loading-screen', () => {
  return {
    AppLoadingScreen: () => {
      const { Text } = jest.requireActual('react-native');
      return <Text>loading-screen</Text>;
    },
  };
});

jest.mock('@/hooks/common/use-auth-session', () => ({
  useAuthSession: (...args: unknown[]) => mockUseAuthSession(...args),
}));

jest.mock('@/lib/audio/audio-manager', () => ({
  releaseAudioPlayers: (...args: unknown[]) => mockReleaseAudioPlayers(...args),
}));

describe('RootLayout', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockUseAuthSession.mockReturnValue({
      isReady: true,
      userId: 'user-1',
      needsUsernameSetup: false,
      error: null,
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('isReady=false の間はローディングを表示する', () => {
    mockUseAuthSession.mockReturnValue({
      isReady: false,
      userId: null,
      needsUsernameSetup: false,
      error: null,
    });

    const { getByText } = render(<RootLayout />);

    expect(getByText('loading-screen')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('初期化完了かつユーザーネーム未設定なら /username-setup に遷移する', async () => {
    mockUseAuthSession.mockReturnValue({
      isReady: true,
      userId: 'user-1',
      needsUsernameSetup: true,
      error: null,
    });

    render(<RootLayout />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/username-setup');
    });
  });

  it('エラー時はエラー表示し、username-setup に遷移しない', () => {
    mockUseAuthSession.mockReturnValue({
      isReady: true,
      userId: null,
      needsUsernameSetup: true,
      error: new Error('network down'),
    });

    const { getByText } = render(<RootLayout />);

    expect(getByText('接続できませんでした。再起動してください。')).toBeTruthy();
    expect(getByText('network down')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('正常時は Stack を表示する', () => {
    const { getByTestId } = render(<RootLayout />);

    expect(getByTestId('stack')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('アンマウント時に audio player を解放する', () => {
    const { unmount } = render(<RootLayout />);

    unmount();

    expect(mockReleaseAudioPlayers).toHaveBeenCalled();
  });
});
