import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View, Text } from 'react-native';
import 'react-native-reanimated';

import { AppLoadingScreen } from '@/components/organism/app-loading-screen';
import { useAuthSession } from '@/hooks/common/use-auth-session';
import { releaseAudioPlayers } from '@/lib/audio/audio-manager';

import '../../global.css';

export default function RootLayout() {
  const router = useRouter();
  const { isReady, needsUsernameSetup, error } = useAuthSession();

  useEffect(() => {
    return () => {
      releaseAudioPlayers();
    };
  }, []);

  useEffect(() => {
    if (isReady && !error && needsUsernameSetup) {
      router.replace('/username-setup');
    }
  }, [isReady, error, needsUsernameSetup, router]);

  if (!isReady) {
    return <AppLoadingScreen />;
  }

  if (error) {
    console.error('[Auth Error]', error);
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', padding: 24 }}>
        <Text style={{ color: '#fff', marginBottom: 12 }}>接続できませんでした。再起動してください。</Text>
        <Text style={{ color: '#f87171', fontSize: 11, textAlign: 'center' }}>{error.message}</Text>
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
