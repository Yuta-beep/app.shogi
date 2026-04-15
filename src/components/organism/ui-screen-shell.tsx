import { useRouter } from 'expo-router';
import { ReactNode } from 'react';
import {
  ImageBackground,
  ImageSourcePropType,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
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
  hideTitleText?: boolean;
  plainHeader?: boolean;
  homeButtonTextClassName?: string;
  /** ユーザーバー（GlobalHomeHud）直下〜画面下端までを覆う背景。タイトル帯・スクロール領域の下にまで伸びる */
  fullBleedBackgroundSource?: ImageSourcePropType;
};

export function UiScreenShell({
  title,
  subtitle,
  children,
  hideBackButton = false,
  rightAction,
  hideTitleText = false,
  plainHeader = false,
  homeButtonTextClassName = 'text-ink',
  fullBleedBackgroundSource,
}: UiScreenShellProps) {
  const router = useRouter();

  const header = (
    <View
      className={
        plainHeader
          ? `px-4 ${hideBackButton ? 'py-1.5' : 'py-2'}`
          : `border-b-2 border-accent/50 bg-[#f2e4c2] px-4 ${hideBackButton ? 'py-1.5' : 'py-3'}`
      }
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
            <Text className={`text-sm font-bold ${homeButtonTextClassName}`}>ホーム</Text>
          </Pressable>
        )}
      </View>
      {!hideTitleText ? (
        <>
          <Text className={`${hideBackButton ? 'mt-0' : 'mt-3'} text-2xl font-black text-ink`}>
            {title}
          </Text>
          {subtitle ? (
            <Text className={`${hideBackButton ? 'mt-0' : 'mt-1'} text-sm text-[#6b4532]`}>
              {subtitle}
            </Text>
          ) : null}
        </>
      ) : null}
    </View>
  );

  const scroll = (
    <ScrollView className="flex-1" contentContainerClassName="p-4 pb-10">
      {children}
    </ScrollView>
  );

  return (
    <SafeAreaView
      className={`flex-1 ${fullBleedBackgroundSource ? 'bg-black' : 'bg-paper'}`}
      edges={['left', 'right', 'bottom']}
    >
      <GlobalHomeHud />
      {fullBleedBackgroundSource ? (
        <ImageBackground
          source={fullBleedBackgroundSource}
          resizeMode="cover"
          style={{ flex: 1, width: '100%' }}
        >
          <View className="flex-1">
            {header}
            {scroll}
          </View>
        </ImageBackground>
      ) : (
        <>
          {header}
          {scroll}
        </>
      )}
    </SafeAreaView>
  );
}
