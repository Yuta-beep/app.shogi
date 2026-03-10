import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';

import { BgmTrack, SeTrack, bgmSources, seSources } from '@/constants/audio-assets';

let audioModeReady = false;
let activeBgmTrack: BgmTrack | null = null;
let activeBgmPlayer: AudioPlayer | null = null;
const sePlayers = new Map<SeTrack, AudioPlayer>();

async function ensureAudioMode() {
  if (audioModeReady) {
    return;
  }

  await setAudioModeAsync({
    playsInSilentMode: true,
    interruptionMode: 'duckOthers',
    allowsRecording: false,
    shouldPlayInBackground: false,
    shouldRouteThroughEarpiece: false,
  });
  audioModeReady = true;
}

function clearBgmPlayer() {
  if (!activeBgmPlayer) {
    return;
  }
  activeBgmPlayer.pause();
  activeBgmPlayer.remove();
  activeBgmPlayer = null;
  activeBgmTrack = null;
}

export async function playBgm(track: BgmTrack, volume = 0.55) {
  const source = bgmSources[track];
  if (!source) {
    return;
  }

  await ensureAudioMode();

  if (activeBgmTrack === track && activeBgmPlayer) {
    activeBgmPlayer.volume = volume;
    if (!activeBgmPlayer.playing) {
      activeBgmPlayer.play();
    }
    return;
  }

  clearBgmPlayer();

  const player = createAudioPlayer(source, { keepAudioSessionActive: true });
  player.loop = true;
  player.volume = volume;
  player.play();

  activeBgmPlayer = player;
  activeBgmTrack = track;
}

export function stopBgm(track?: BgmTrack) {
  if (!activeBgmPlayer) {
    return;
  }
  if (track && activeBgmTrack !== track) {
    return;
  }
  clearBgmPlayer();
}

export async function playSe(track: SeTrack, volume = 1) {
  const source = seSources[track];
  if (!source) {
    return;
  }

  await ensureAudioMode();

  let player = sePlayers.get(track) ?? null;
  if (!player) {
    player = createAudioPlayer(source, { keepAudioSessionActive: false });
    sePlayers.set(track, player);
  }

  player.volume = volume;
  try {
    await player.seekTo(0);
  } catch {
    // Ignore seek failures while the source is still loading.
  }
  player.play();
}

export function releaseAudioPlayers() {
  clearBgmPlayer();
  sePlayers.forEach((player) => {
    player.pause();
    player.remove();
  });
  sePlayers.clear();
}
