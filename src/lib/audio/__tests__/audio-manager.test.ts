const mockCreateAudioPlayer = jest.fn();
const mockSetAudioModeAsync = jest.fn().mockResolvedValue(undefined);

jest.mock('expo-audio', () => ({
  createAudioPlayer: (...args: unknown[]) => mockCreateAudioPlayer(...args),
  setAudioModeAsync: (...args: unknown[]) => mockSetAudioModeAsync(...args),
}));

jest.mock('@/constants/audio-assets', () => ({
  bgmSources: {
    title: 101,
    home: 102,
    dungeonSelect: 103,
    battle: 104,
    deckBuilder: 105,
    catalog: 106,
    shop: 107,
    gacha: 108,
    matching: 109,
    onlineBattle: 110,
    specialDungeon: 111,
  },
  seSources: {
    tap: 201,
    confirm: 202,
    cancel: 203,
  },
}));

type MockPlayer = {
  playing: boolean;
  loop: boolean;
  volume: number;
  play: jest.Mock<void, []>;
  pause: jest.Mock<void, []>;
  remove: jest.Mock<void, []>;
  seekTo: jest.Mock<Promise<void>, [number]>;
};

function newPlayer(): MockPlayer {
  const player: MockPlayer = {
    playing: false,
    loop: false,
    volume: 1,
    play: jest.fn(() => {
      player.playing = true;
    }),
    pause: jest.fn(),
    remove: jest.fn(),
    seekTo: jest.fn().mockResolvedValue(undefined),
  };
  return player;
}

function loadManager() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@/lib/audio/audio-manager') as typeof import('@/lib/audio/audio-manager');
}

describe('audio-manager', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockCreateAudioPlayer.mockImplementation(() => newPlayer());
  });

  it('plays BGM by creating a looping player', async () => {
    const manager = loadManager();

    await manager.playBgm('title', 0.4);

    expect(mockSetAudioModeAsync).toHaveBeenCalledTimes(1);
    expect(mockCreateAudioPlayer).toHaveBeenCalledWith(101, { keepAudioSessionActive: true });
    const created = mockCreateAudioPlayer.mock.results[0].value as MockPlayer;
    expect(created.loop).toBe(true);
    expect(created.volume).toBe(0.4);
    expect(created.play).toHaveBeenCalledTimes(1);
  });

  it('reuses the same player when the same BGM track is requested again', async () => {
    const manager = loadManager();

    await manager.playBgm('home', 0.3);
    await manager.playBgm('home', 0.6);

    expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(1);
    const created = mockCreateAudioPlayer.mock.results[0].value as MockPlayer;
    expect(created.volume).toBe(0.6);
    expect(created.play).toHaveBeenCalledTimes(1);
  });

  it('plays SE from the beginning', async () => {
    const manager = loadManager();

    await manager.playSe('tap', 0.8);

    expect(mockSetAudioModeAsync).toHaveBeenCalledTimes(1);
    expect(mockCreateAudioPlayer).toHaveBeenCalledWith(201, { keepAudioSessionActive: false });
    const created = mockCreateAudioPlayer.mock.results[0].value as MockPlayer;
    expect(created.volume).toBe(0.8);
    expect(created.seekTo).toHaveBeenCalledWith(0);
    expect(created.play).toHaveBeenCalledTimes(1);
  });
});
