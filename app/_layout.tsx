import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { releaseAudioPlayers } from '@/lib/audio/audio-manager';

import '../global.css';

export default function RootLayout() {
  useEffect(() => {
    return () => {
      releaseAudioPlayers();
    };
  }, []);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="light" />
    </>
  );
}
