import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppLoadingScreen } from '@/components/organism/app-loading-screen';
import {
  onlineBattleHtmlAssets,
  onlineBattleHtmlPreloadTargets,
} from '@/constants/online-battle-html-assets';
import { homeAssets } from '@/constants/home-assets';
import { parseOnlineBattleDisplay } from '@/features/online-battle/lib/parse-session-labels';
import { useOnlineBattleScreen } from '@/features/online-battle/ui/use-online-battle-screen';
import { useAssetPreload } from '@/hooks/common/use-asset-preload';
import { useScreenBgm } from '@/hooks/common/use-screen-bgm';
import { playSe } from '@/lib/audio/audio-manager';

/** HTML `.app` の max-width に合わせる */
const HTML_APP_MAX_WIDTH = 540;

export function OnlineBattleScreen() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const params = useLocalSearchParams<{ opponent?: string; rating?: string }>();
  const { session, isLoading } = useOnlineBattleScreen(params.opponent, params.rating);
  const { isReady: areAssetsReady } = useAssetPreload(onlineBattleHtmlPreloadTargets);
  useScreenBgm('onlineBattle');

  const [lanServerUrl, setLanServerUrl] = useState('ws://localhost:8080');
  const [lanRoomId, setLanRoomId] = useState('room1');
  const [lanStatusLine, setLanStatusLine] = useState('');

  const contentWidth = Math.min(windowWidth - 24, HTML_APP_MAX_WIDTH);
  const boardSize = Math.min(contentWidth - 8, HTML_APP_MAX_WIDTH);

  const display = parseOnlineBattleDisplay(session);

  const goHome = useCallback(() => {
    void playSe('tap');
    router.replace('/home');
  }, [router]);

  const onLanConnect = useCallback(
    (role: 'first' | 'second') => {
      void playSe('tap');
      const label = role === 'first' ? '先手' : '後手';
      setLanStatusLine(
        `${label}で入室リクエスト（モック: 実際の WebSocket 接続は未実装） — ${lanServerUrl} / ${lanRoomId}`,
      );
    },
    [lanRoomId, lanServerUrl],
  );

  if (isLoading || !areAssetsReady) {
    return <AppLoadingScreen imageSource={homeAssets.loadingImage} />;
  }

  return (
    <ImageBackground
      source={onlineBattleHtmlAssets.pageBackground}
      resizeMode="cover"
      style={styles.pageRoot}
    >
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeTop}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 32 }]}
        >
          <View
            style={[
              styles.appColumn,
              { maxWidth: HTML_APP_MAX_WIDTH, width: '100%', alignSelf: 'center' },
            ]}
          >
            {/* HTML .header */}
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="ホームに戻る"
                  onPress={goHome}
                  style={({ pressed }) => [
                    styles.homeBackBtn,
                    { marginBottom: 16, opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <MaterialIcons name="arrow-back" size={28} color="#fff" />
                </Pressable>
                <Text style={styles.titleText} numberOfLines={2}>
                  オンライン対戦
                </Text>
              </View>

              <View style={styles.ratingPanel}>
                <View style={styles.ratingCardOffsetLeft}>
                  <View style={styles.ratingCardInner}>
                    <Text style={styles.ratingLabel}>Opponent</Text>
                    <Text style={styles.ratingValue} numberOfLines={1}>
                      {display.opponentName}
                    </Text>
                    <Text style={styles.ratingMeta}>
                      レート <Text style={styles.ratingMetaStrong}>{display.opponentRating}</Text>
                    </Text>
                  </View>
                </View>
                <View style={styles.ratingCardOffsetRight}>
                  <View style={styles.ratingCardInner}>
                    <Text style={styles.ratingLabel}>You</Text>
                    <Text style={styles.ratingValue} numberOfLines={1}>
                      {display.playerName}
                    </Text>
                    <Text style={styles.ratingMeta}>
                      レート <Text style={styles.ratingMetaStrong}>{display.playerRating}</Text>
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* LAN パネル */}
            <View style={styles.lanPanel}>
              <Text style={styles.lanTitle}>LAN対戦（同じWi-Fi内）</Text>
              <View style={styles.lanRow}>
                <Text style={styles.lanLabel}>サーバーURL:</Text>
                <TextInput
                  value={lanServerUrl}
                  onChangeText={setLanServerUrl}
                  placeholder="ws://192.168.x.x:8080"
                  placeholderTextColor="#aaa"
                  style={styles.lanInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <View style={[styles.lanRow, { marginTop: 8 }]}>
                <Text style={styles.lanLabel}>部屋ID:</Text>
                <TextInput
                  value={lanRoomId}
                  onChangeText={setLanRoomId}
                  placeholder="例: room1"
                  placeholderTextColor="#aaa"
                  style={[styles.lanInput, { maxWidth: 120 }]}
                />
              </View>
              <View style={styles.lanButtons}>
                <Pressable
                  onPress={() => onLanConnect('first')}
                  style={({ pressed }) => [
                    styles.lanBtn,
                    styles.lanBtnGreen,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text style={styles.lanBtnText}>先手で入室</Text>
                </Pressable>
                <Pressable
                  onPress={() => onLanConnect('second')}
                  style={({ pressed }) => [
                    styles.lanBtn,
                    styles.lanBtnBlue,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text style={styles.lanBtnText}>後手で入室</Text>
                </Pressable>
              </View>
              {lanStatusLine ? <Text style={styles.lanStatus}>{lanStatusLine}</Text> : null}
              <Text style={styles.lanFootnote}>
                ※スマホから接続する場合: サーバーURLに{' '}
                <Text style={{ fontWeight: '800' }}>ws://（PCのIPアドレス）:8080</Text> を入力（例:
                ws://192.168.1.5:8080）。同じWi-Fiにし、接続できない場合はPCのWindowsファイアウォールでポート8080を許可してください。
              </Text>
            </View>

            {/* HTML .row: 盤 → サイド */}
            <View style={styles.rowColumn}>
              <View style={styles.boardWrap}>
                <View style={[styles.boardFrame, { width: boardSize, height: boardSize }]}>
                  <Image
                    source={onlineBattleHtmlAssets.board}
                    contentFit="cover"
                    style={StyleSheet.absoluteFillObject}
                  />
                </View>
                <View style={styles.statusBar}>
                  <Text style={styles.statusText}>{session.connectionStatus}</Text>
                </View>
              </View>

              <View style={[styles.side, { width: contentWidth }]}>
                <Text style={styles.sideHeading}>対戦情報</Text>
                <View style={styles.infoList}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoItemLabel}>ターン</Text>
                    <Text style={styles.infoItemValue}>待機中</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoItemLabel}>ルーム</Text>
                    <Text style={styles.infoItemValue}>#{session.roomId}</Text>
                  </View>
                </View>

                <Text style={[styles.sideHeading, { marginTop: 12 }]}>あなたの持ち駒</Text>
                <View style={styles.handPlaceholder} />

                <Text style={[styles.sideHeading, { marginTop: 12 }]}>敵の持ち駒</Text>
                <View style={styles.handPlaceholder} />

                <Text style={[styles.sideHeading, { marginTop: 12 }]}>対戦ログ</Text>
                <View style={styles.logPanel}>
                  <Text style={styles.logLine}>
                    <Text style={styles.logStrong}>システム</Text>{' '}
                    対戦準備中（盤面・駒操作は今後接続されます）
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  pageRoot: {
    flex: 1,
  },
  safeTop: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    alignItems: 'stretch',
  },
  appColumn: {},
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 0,
  },
  headerLeft: {
    flexShrink: 1,
  },
  homeBackBtn: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: 'rgba(139, 0, 0, 0.88)',
    padding: 10,
  },
  titleText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    maxWidth: HTML_APP_MAX_WIDTH - 16,
  },
  ratingPanel: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginLeft: 'auto',
    justifyContent: 'flex-end',
    maxWidth: '100%',
  },
  ratingCardOffsetLeft: {
    transform: [{ translateX: -8 }],
  },
  ratingCardOffsetRight: {
    transform: [{ translateX: 8 }],
  },
  ratingCardInner: {
    minWidth: 160,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  ratingLabel: {
    fontSize: 12,
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  ratingValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginTop: 2,
  },
  ratingMeta: {
    fontSize: 12,
    color: '#fff',
    marginTop: 4,
  },
  ratingMetaStrong: {
    fontWeight: '700',
  },
  lanPanel: {
    marginVertical: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  lanTitle: {
    color: '#fff',
    fontWeight: '700',
    marginBottom: 8,
    fontSize: 15,
  },
  lanRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  lanLabel: {
    color: '#fff',
    fontSize: 14,
  },
  lanInput: {
    flex: 1,
    minWidth: 160,
    backgroundColor: '#fff',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    color: '#111',
  },
  lanButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  lanBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  lanBtnGreen: {
    backgroundColor: '#4caf50',
  },
  lanBtnBlue: {
    backgroundColor: '#2196f3',
  },
  lanBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  lanStatus: {
    marginTop: 8,
    fontSize: 14,
    color: '#e0e0e0',
  },
  lanFootnote: {
    marginTop: 8,
    fontSize: 12,
    color: '#ccc',
    lineHeight: 18,
  },
  rowColumn: {
    flexDirection: 'column',
    gap: 16,
    alignItems: 'stretch',
    marginTop: 4,
  },
  boardWrap: {
    position: 'relative',
    alignItems: 'center',
  },
  boardFrame: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#2a1810',
  },
  statusBar: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(23, 162, 184, 0.95)',
    width: '100%',
    maxWidth: HTML_APP_MAX_WIDTH,
    alignSelf: 'center',
  },
  statusText: {
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
    fontSize: 14,
  },
  side: {
    alignSelf: 'center',
    backgroundColor: '#f7f9fc',
    borderWidth: 1,
    borderColor: '#e6edf5',
    borderRadius: 12,
    padding: 16,
  },
  sideHeading: {
    marginBottom: 12,
    fontSize: 16,
    fontWeight: '800',
    color: '#333',
  },
  infoList: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 12,
    padding: 12,
    marginBottom: 4,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  infoItemLabel: {
    fontSize: 14,
    color: '#555',
  },
  infoItemValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  handPlaceholder: {
    minHeight: 48,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  logPanel: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    minHeight: 120,
    maxHeight: 240,
  },
  logLine: {
    fontSize: 13,
    color: '#f8fafc',
    opacity: 0.95,
    lineHeight: 20,
  },
  logStrong: {
    color: '#fff',
    fontWeight: '800',
    marginRight: 6,
  },
});
