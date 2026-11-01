import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Camera } from 'react-native-vision-camera';
import { RetroCameraPreview } from '../engine/RetroCameraPreview';
import { ChunkFilmstrip } from './ChunkFilmstrip';
import { warmFilmCamera } from '../cameras/warmFilm';
import { useRecorderSession } from '../recorder/useRecorderSession';
import { RetroExport } from '../../modules/retro-export';

export const RetroCameraScreen: React.FC = () => {
  const cameraRef = useRef<Camera>(null);
  const [lastSavedUri, setLastSavedUri] = useState<string | null>(null);
  const [cameraGeneration, setCameraGeneration] = useState(0);

  const {
    state,
    chunks,
    currentRecordingTimeMs,
    totalDurationMs,
    errorMessage,
    ready, restored, foreground, initialize, onCameraReady, onCameraError,
    start,
    pause,
    continueRec,
    stop,
    exportAndStitch,
    reset,
  } = useRecorderSession(warmFilmCamera, cameraRef);

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handlePrimaryPress = async () => {
    if (state === 'idle' || state === 'error') {
      await start();
    } else if (state === 'recording') {
      await pause();
    } else if (state === 'paused' || state === 'stopped') {
      await continueRec();
    }
  };

  const handleStopPress = async () => {
    if (state === 'recording' || state === 'paused' || state === 'error') {
      await stop();
    }
  };

  const handleExportPress = async () => {
    if (chunks.length === 0) {
      Alert.alert('Лента пуста', 'Сначала запишите хотя бы один кусок видео.');
      return;
    }

    const result = await exportAndStitch();
    if (result.success) {
      setLastSavedUri(result.outputUri);
      Alert.alert(
        'Готово!',
        `Ролик с эффектом сохранён в галерею. Кусков: ${chunks.length}. Исходные записи сохранены в приложении.`,
        [
          {
            text: 'Новая съёмка',
            onPress: () => { void reset(); },
          },
          { text: 'Открыть ролик', onPress: () => { void RetroExport.openVideo(result.outputUri).catch(e => Alert.alert('Проигрыватель', String(e))); } },
          { text: 'OK' },
        ]
      );
    } else {
      Alert.alert('Ошибка экспорта', result.error || 'Не удалось экспортировать ролик');
    }
  };

  const isRecording = state === 'recording';
  const isFinalizing = state === 'finalizing' || state === 'starting';
  const isExporting = state === 'exporting';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Верхняя панель: статус, индикатор REC, время */}
      <View style={styles.topBar}>
        <View style={styles.cameraTitleContainer}>
          <Text numberOfLines={1} style={styles.cameraTitle}>{warmFilmCamera.name.toUpperCase()}</Text>
          <Text style={styles.badgeFree}>БЕСПЛАТНО</Text>
        </View>

        <View style={styles.timerContainer}>
          {isRecording && <View style={styles.recDot} />}
          <Text style={styles.timerText}>
            {formatTime(totalDurationMs)}
            {isRecording ? ` (+${formatTime(currentRecordingTimeMs)})` : ''}
          </Text>
        </View>

        <View style={styles.chunkCounter}>
          <Text style={styles.chunkCounterText}>Кусков: {chunks.length}</Text>
        </View>
      </View>

      {/* Центральная зона: Живое превью с наложением эффекта Skia */}
      <View style={styles.previewContainer}>
        <RetroCameraPreview
          key={cameraGeneration}
          cameraProfile={warmFilmCamera}
          cameraRef={cameraRef}
          isActive={foreground && state !== 'exporting'}
          onReady={onCameraReady}
          onError={onCameraError}
        />

        {/* Оверлей при экспорте */}
        {isExporting && (
          <View style={styles.exportOverlay}>
            <ActivityIndicator size="large" color="#FFB300" />
            <Text style={styles.exportOverlayText}>Склейка кусков и наложение плёнки на GPU...</Text>
            <Text style={styles.exportSubText}>Пожалуйста, подождите. Видео сохраняется в Галерею.</Text>
          </View>
        )}

        {/* Оповещение об ошибке */}
        {errorMessage && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
            <TouchableOpacity onPress={() => {setCameraGeneration(v=>v+1); if(!restored) void initialize();}}>
              <Text style={styles.errorBannerText}>Повторить проверку камеры и сессии</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Лента записанных кусков */}
      <ChunkFilmstrip chunks={chunks} />

      {/* Нижняя панель управления съёмкой */}
      <View style={styles.controlsBar}>
        {/* Кнопка СТОП */}
        <TouchableOpacity
          style={[
            styles.secondaryButton,
            (state === 'idle' || isExporting || isFinalizing) && styles.buttonDisabled,
          ]}
          onPress={handleStopPress}
          disabled={state === 'idle' || isExporting || isFinalizing}
        >
          <View style={styles.stopSquare} />
          <Text style={styles.secondaryButtonText}>СТОП</Text>
        </TouchableOpacity>

        {/* Основная кнопка ЗАПИСЬ / ПАУЗА / ПРОДОЛЖИТЬ */}
        <TouchableOpacity
          style={[styles.primaryButton, isFinalizing && styles.buttonDisabled]}
          onPress={handlePrimaryPress}
          disabled={isFinalizing || isExporting || !ready}
        >
          <View
            style={[
              styles.primaryButtonInner,
              isRecording ? styles.innerPause : styles.innerRecord,
            ]}
          >
            {isRecording ? (
              <View style={styles.pauseBarsContainer}>
                <View style={styles.pauseBar} />
                <View style={styles.pauseBar} />
              </View>
            ) : null}
          </View>
          <Text style={styles.primaryButtonLabel}>
            {isRecording
              ? 'ПАУЗА'
              : state === 'paused' || state === 'stopped'
              ? 'ПРОДОЛЖИТЬ'
              : 'ЗАПИСЬ'}
          </Text>
        </TouchableOpacity>

        {/* Кнопка «Склеить и сохранить» */}
        <TouchableOpacity
          style={[
            styles.stitchButton,
            (chunks.length === 0 || isRecording || isExporting || isFinalizing) &&
              styles.buttonDisabled,
          ]}
          onPress={handleExportPress}
          disabled={!restored || chunks.length === 0 || isRecording || isExporting || isFinalizing}
        >
          <Text style={styles.stitchButtonIcon}>🎞️</Text>
          <Text style={styles.stitchButtonText}>Склеить</Text>
        </TouchableOpacity>
      </View>
      {lastSavedUri && <TouchableOpacity onPress={() => {void RetroExport.openVideo(lastSavedUri).catch(e=>Alert.alert('Проигрыватель',String(e)));}}>
        <Text style={styles.savedLink}>Открыть последний сохранённый ролик</Text>
      </TouchableOpacity>}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
  topBar: {
    height: 52,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#121212',
  },
  cameraTitleContainer: {
    flex: 1,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cameraTitle: {
    flexShrink: 1,
    color: '#ffb300',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  badgeFree: {
    marginLeft: 6,
    backgroundColor: '#2e7d32',
    color: '#fff',
    fontSize: 9,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    fontWeight: '600',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ff3d00',
    marginRight: 6,
  },
  timerText: {
    color: '#fff',
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    fontWeight: 'bold',
  },
  chunkCounter: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#222',
    borderRadius: 4,
  },
  chunkCounterText: {
    color: '#bbb',
    fontSize: 12,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
  exportOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  exportOverlayText: {
    color: '#ffb300',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  exportSubText: {
    color: '#bbb',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  errorBanner: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(211, 47, 47, 0.9)',
    padding: 10,
    borderRadius: 6,
  },
  errorBannerText: {
    color: '#fff',
    fontSize: 13,
    textAlign: 'center',
  },
  controlsBar: {
    height: 110,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#141414',
    paddingHorizontal: 20,
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#ffffff',
  },
  innerRecord: {
    backgroundColor: '#d32f2f',
  },
  innerPause: {
    backgroundColor: '#f57c00',
  },
  pauseBarsContainer: {
    flexDirection: 'row',
    width: 22,
    justifyContent: 'space-between',
  },
  pauseBar: {
    width: 7,
    height: 22,
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  primaryButtonLabel: {
    color: '#ddd',
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 4,
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
  },
  stopSquare: {
    width: 24,
    height: 24,
    backgroundColor: '#e53935',
    borderRadius: 4,
  },
  secondaryButtonText: {
    color: '#bbb',
    fontSize: 11,
    marginTop: 6,
    fontWeight: '600',
  },
  stitchButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
  },
  stitchButtonIcon: {
    fontSize: 26,
  },
  stitchButtonText: {
    color: '#ffb300',
    fontSize: 11,
    marginTop: 4,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.35,
  },
  savedLink: {color:'#ffb300',textAlign:'center',padding:12},
});
