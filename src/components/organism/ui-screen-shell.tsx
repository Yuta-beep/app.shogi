import { useRouter } from 'expo-router';
import { ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/atom/back-button';
import { GlobalHomeHud } from '@/components/organism/global-home-hud';
import { playSe } from '@/lib/audio/audio-manager';

type UiScreenShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  hideBackButton?: boolean;
  rightAction?: ReactNode;
};

export function UiScreenShell({
  title,
  subtitle,
  children,
  hideBackButton = false,
  rightAction,
}: UiScreenShellProps) {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['left', 'right', 'bottom']}>
      <GlobalHomeHud />
      <View
        className={`border-b-2 border-accent/50 bg-[#f2e4c2] px-4 ${hideBackButton ? 'py-1.5' : 'py-3'}`}
      >
        <View className="flex-row items-center justify-between">
          {hideBackButton ? (
            <View />
          ) : (
            <BackButton
              onPress={() => {
                void playSe('tap');
                router.back();
              }}
            />
          )}
          {rightAction ?? (
            <Pressable
              onPress={() => {
                void playSe('tap');
                router.replace('/home');
              }}
              className="rounded-md border border-accent px-3 py-1 active:scale-95"
            >
              <Text className="text-sm font-bold text-ink">ホーム</Text>
            </Pressable>
          )}
        </View>
        <Text className={`${hideBackButton ? 'mt-0' : 'mt-3'} text-2xl font-black text-ink`}>
          {title}
        </Text>
        {subtitle ? (
          <Text className={`${hideBackButton ? 'mt-0' : 'mt-1'} text-sm text-[#6b4532]`}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <ScrollView className="flex-1" contentContainerClassName="p-4 pb-10">
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
