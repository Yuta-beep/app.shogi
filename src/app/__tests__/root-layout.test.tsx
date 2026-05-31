import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

import RootLayout from '@/app/_layout';

jest.mock('../../../global.css', () => ({}));

const mockReplace = jest.fn();
const mockReleaseAudioPlayers = jest.fn();
const mockUseAuthSession = jest.fn();
const MockText = Text;

jest.mock('expo-router', () => {
  return {
    Stack: () => <MockText testID="stack">stack</MockText>,
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
    AppLoadingScreen: ({ label }: { label?: string }) => (
      <MockText>{label ?? 'loading-screen'}</MockText>
    ),
  };
});

jest.mock('@/hooks/common/auth-session-context', () => ({
  AuthSessionProvider: ({ children }: { children: React.ReactNode }) => children,
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
      accessToken: 'token-1',
      needsUsernameSetup: false,
      error: null,
      statusMessage: null,
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('isReady=false の間はローディングを表示する', () => {
    mockUseAuthSession.mockReturnValue({
      isReady: false,
      userId: null,
      accessToken: null,
      needsUsernameSetup: false,
      error: null,
      statusMessage: null,
    });

    const { getByText } = render(<RootLayout />);

    expect(getByText('loading-screen')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('初期化完了かつユーザーネーム未設定なら /username-setup に遷移する', async () => {
    mockUseAuthSession.mockReturnValue({
      isReady: true,
      userId: 'user-1',
      accessToken: 'token-1',
      needsUsernameSetup: true,
      error: null,
      statusMessage: null,
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
      accessToken: null,
      needsUsernameSetup: true,
      error: new Error('network down'),
      statusMessage: null,
    });

    const { getByText } = render(<RootLayout />);

    expect(getByText('接続できませんでした。時間をおいてもう一度お試しください。')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('認証retry中はローディング文言を差し替える', () => {
    mockUseAuthSession.mockReturnValue({
      isReady: false,
      userId: null,
      accessToken: null,
      needsUsernameSetup: false,
      error: null,
      statusMessage: 'サーバーの応答に時間がかかっています',
    });

    const { getByText } = render(<RootLayout />);

    expect(getByText('サーバーの応答に時間がかかっています')).toBeTruthy();
  });

  it('ユーザー向けエラーメッセージがあればそれを表示する', () => {
    const error = Object.assign(new Error('Request rate limit reached'), {
      userMessage: '接続が混み合っています。時間をおいてもう一度お試しください。',
    });
    mockUseAuthSession.mockReturnValue({
      isReady: true,
      userId: null,
      accessToken: null,
      needsUsernameSetup: false,
      error,
      statusMessage: null,
    });

    const { getByText } = render(<RootLayout />);

    expect(getByText('接続が混み合っています。時間をおいてもう一度お試しください。')).toBeTruthy();
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
