import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View, Text } from 'react-native';
import 'react-native-reanimated';

import { AppLoadingScreen } from '@/components/module/app-loading-screen';
import { useAuthSession } from '@/hooks/common/use-auth-session';
import { releaseAudioPlayers } from '@/lib/audio/audio-manager';

import '../global.css';

export default function RootLayout() {
  const { isReady, error } = useAuthSession();

  useEffect(() => {
    return () => {
      releaseAudioPlayers();
    };
  }, []);

  if (!isReady) {
    return <AppLoadingScreen />;
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <Text style={{ color: '#fff' }}>接続できませんでした。再起動してください。</Text>
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="light" />
    </>
  );
}
