jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({
    play: jest.fn(),
    pause: jest.fn(),
    seekTo: jest.fn(),
    remove: jest.fn(),
    loop: false,
    volume: 1,
  })),
  setAudioModeAsync: jest.fn(),
}));

afterEach(() => {
  jest.clearAllMocks();
});
