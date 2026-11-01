import { SessionManager, CameraDriver, StorageAdapter, NativeExporterAdapter } from '../SessionManager';
import { warmFilmCamera } from '../../cameras/warmFilm';
import { SessionCatalog } from '../types';

describe('SessionManager Unit Tests (Этап 0)', () => {
  let mockCameraDriver: jest.Mocked<CameraDriver>;
  let mockStorage: jest.Mocked<StorageAdapter>;
  let mockExporter: jest.Mocked<NativeExporterAdapter>;
  let manager: SessionManager;

  beforeEach(() => {
    mockCameraDriver = {
      startRecording: jest.fn().mockResolvedValue(undefined),
      stopRecording: jest.fn().mockResolvedValue({
        uri: 'file:///data/user/0/com.eai.retrocamera/cache/chunk1.mp4',
        durationMs: 5200,
        sizeBytes: 2048500,
      }),
    };

    mockStorage = {
      saveSession: jest.fn().mockResolvedValue(undefined),
      loadSession: jest.fn().mockResolvedValue(null),
      verifyFile: jest.fn().mockResolvedValue({ exists: true, sizeBytes: 2048500 }),
    };

    mockExporter = {
      exportChunks: jest.fn().mockResolvedValue({
        success: true,
        outputUri: 'content://media/external/video/media/10042',
        durationMs: 15400,
      }),
    };

    manager = new SessionManager(warmFilmCamera, {
      storage: mockStorage,
      cameraDriver: mockCameraDriver,
      nativeExporter: mockExporter,
    });
  });

  test('Начальное состояние сессии должно быть idle и без кусков', () => {
    expect(manager.getState()).toBe('idle');
    expect(manager.getChunks()).toHaveLength(0);
    expect(manager.getTotalDurationMs()).toBe(0);
  });

  test('ЗАПИСЬ переводит состояние в recording', async () => {
    const started = await manager.startRecording();
    expect(started).toBe(true);
    expect(manager.getState()).toBe('recording');
    expect(mockCameraDriver.startRecording).toHaveBeenCalledTimes(1);
  });

  test('Быстрые повторные вызовы startRecording не создают дублей', async () => {
    // Симулируем параллельные быстрые нажатия
    const [p1, p2] = await Promise.all([
      manager.startRecording(),
      manager.startRecording(),
    ]);

    expect(p1 !== p2).toBe(true); // один выполнился, второй отклонён блокировкой
    expect(manager.getState()).toBe('recording');
    expect(mockCameraDriver.startRecording).toHaveBeenCalledTimes(1);
  });

  test('ПАУЗА во время записи финализирует кусок и переводит в paused', async () => {
    await manager.startRecording();
    const paused = await manager.pauseRecording();

    expect(paused).toBe(true);
    expect(manager.getState()).toBe('paused');
    expect(mockCameraDriver.stopRecording).toHaveBeenCalledTimes(1);
    expect(manager.getChunks()).toHaveLength(1);
    expect(manager.getChunks()[0].durationMs).toBe(5200);
    expect(manager.getTotalDurationMs()).toBe(5200);
    expect(mockStorage.saveSession).toHaveBeenLastCalledWith(expect.objectContaining({
      chunks: [expect.objectContaining({uri: expect.stringContaining('chunk1.mp4'), durationMs: 5200})],
    }));
  });

  test('Повторное нажатие ПАУЗА во время паузы игнорируется', async () => {
    await manager.startRecording();
    await manager.pauseRecording();

    const secondPause = await manager.pauseRecording();
    expect(secondPause).toBe(false);
    expect(manager.getState()).toBe('paused');
    expect(manager.getChunks()).toHaveLength(1);
  });

  test('ПРОДОЛЖИТЬ после паузы начинает новый кусок в той же сессии', async () => {
    await manager.startRecording();
    await manager.pauseRecording();

    // Второй кусок
    mockCameraDriver.stopRecording.mockResolvedValueOnce({
      uri: 'file:///data/user/0/com.eai.retrocamera/cache/chunk2.mp4',
      durationMs: 4800,
      sizeBytes: 1980000,
    });

    const continued = await manager.continueRecording();
    expect(continued).toBe(true);
    expect(manager.getState()).toBe('recording');

    await manager.pauseRecording();
    expect(manager.getState()).toBe('paused');
    expect(manager.getChunks()).toHaveLength(2);
    expect(manager.getTotalDurationMs()).toBe(10000);
    expect(manager.getChunks()[0].uri).toContain('chunk1.mp4');
    expect(manager.getChunks()[1].uri).toContain('chunk2.mp4');
  });

  test('СТОП во время активной записи финализирует кусок и переходит в stopped', async () => {
    await manager.startRecording();
    const stopped = await manager.stopRecording();

    expect(stopped).toBe(true);
    expect(manager.getState()).toBe('stopped');
    expect(manager.getChunks()).toHaveLength(1);
  });

  test('СТОП после паузы не создает лишних пустых кусков', async () => {
    await manager.startRecording();
    await manager.pauseRecording();
    expect(manager.getChunks()).toHaveLength(1);

    const stopped = await manager.stopRecording();
    expect(stopped).toBe(true);
    expect(manager.getState()).toBe('stopped');
    expect(manager.getChunks()).toHaveLength(1); // кусков по-прежнему 1
    expect(mockCameraDriver.stopRecording).toHaveBeenCalledTimes(1); // драйвер не вызывался повторно
  });

  test('ПРОДОЛЖИТЬ после СТОП позволяет дописать новый кусок в ленту', async () => {
    await manager.startRecording();
    await manager.stopRecording();
    expect(manager.getState()).toBe('stopped');

    mockCameraDriver.stopRecording.mockResolvedValueOnce({
      uri: 'file:///data/user/0/com.eai.retrocamera/cache/chunk2.mp4',
      durationMs: 3500,
      sizeBytes: 1500000,
    });

    await manager.continueRecording();
    expect(manager.getState()).toBe('recording');
    await manager.stopRecording();
    expect(manager.getState()).toBe('stopped');
    expect(manager.getChunks()).toHaveLength(2);
    expect(manager.getTotalDurationMs()).toBe(8700);
  });

  test('Ошибка верификации файла (0 байт) не добавляет кусок в ленту', async () => {
    mockStorage.verifyFile.mockResolvedValueOnce({ exists: true, sizeBytes: 0 });

    await manager.startRecording();
    const paused = await manager.pauseRecording();

    expect(paused).toBe(false);
    expect(manager.getState()).toBe('error');
    expect(manager.getChunks()).toHaveLength(0);
    expect(manager.getErrorMessage()).toContain('пуст');
  });

  test('Неудачный экспорт не стирает сессию и исходные куски', async () => {
    await manager.startRecording();
    await manager.pauseRecording();
    expect(manager.getChunks()).toHaveLength(1);

    mockExporter.exportChunks.mockRejectedValueOnce(new Error('Media3 Transcode Error: Out of memory'));

    const result = await manager.exportAndStitch();

    expect(result.success).toBe(false);
    expect(result.error).toContain('Media3 Transcode Error');
    // Исходные куски в ленте должны остаться нетронутыми!
    expect(manager.getChunks()).toHaveLength(1);
    expect(manager.getState()).toBe('paused');
  });

  test('Склейка 3 кусков вызывает нативный экспортер с правильным списком URI', async () => {
    // Кусок 1
    await manager.startRecording();
    await manager.pauseRecording();

    // Кусок 2
    mockCameraDriver.stopRecording.mockResolvedValueOnce({
      uri: 'file:///data/user/0/com.eai.retrocamera/cache/chunk2.mp4',
      durationMs: 5000,
      sizeBytes: 2000000,
    });
    await manager.continueRecording();
    await manager.pauseRecording();

    // Кусок 3
    mockCameraDriver.stopRecording.mockResolvedValueOnce({
      uri: 'file:///data/user/0/com.eai.retrocamera/cache/chunk3.mp4',
      durationMs: 5500,
      sizeBytes: 2200000,
    });
    await manager.continueRecording();
    await manager.stopRecording();

    expect(manager.getChunks()).toHaveLength(3);

    const exportRes = await manager.exportAndStitch();
    expect(exportRes.success).toBe(true);
    expect(exportRes.outputUri).toContain('content://');
    expect(mockExporter.exportChunks).toHaveBeenCalledWith({
      inputUris: [
        'file:///data/user/0/com.eai.retrocamera/cache/chunk1.mp4',
        'file:///data/user/0/com.eai.retrocamera/cache/chunk2.mp4',
        'file:///data/user/0/com.eai.retrocamera/cache/chunk3.mp4',
      ],
      filterConfig: warmFilmCamera.filterConfig,
      saveToGallery: true,
    });
  });

  test('Восстановление сессии из сохраненного каталога', () => {
    const savedCatalog: SessionCatalog = {
      sessionId: 'session_restored_1',
      createdAt: 1700000000000,
      cameraProfileId: 'warm-film',
      chunks: [
        {
          id: 'chunk_1',
          uri: 'file:///data/user/0/com.eai.retrocamera/cache/c1.mp4',
          durationMs: 6000,
          fileSizeBytes: 2400000,
          createdAt: 1700000005000,
        },
      ],
      totalDurationMs: 6000,
    };

    manager.restoreFromCatalog(savedCatalog);
    expect(manager.getSessionId()).toBe('session_restored_1');
    expect(manager.getChunks()).toHaveLength(1);
    expect(manager.getState()).toBe('stopped');
  });
});
