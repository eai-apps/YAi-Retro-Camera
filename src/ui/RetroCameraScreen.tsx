import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, FlatList, Image, Modal, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Camera } from 'react-native-vision-camera';
import Slider from '@react-native-community/slider';
import {useCameraHardware} from '../features/useCameraHardware';
import * as ImagePicker from 'expo-image-picker';
import { RetroExport, SavedMedia } from '../../modules/retro-export';
import { cameras, cameraById } from '../cameras';
import { resolveEffect } from '../engine/effect';
import { RetroCameraPreview } from '../engine/RetroCameraPreview';
import { useAppSettings, PhotoLayout, Quality, AppSettings } from '../features/settings';
import { useRecorderSession } from '../recorder/useRecorderSession';
import { RecordedChunk } from '../recorder/types';
import { ChunkFilmstrip } from './ChunkFilmstrip';
import { Choice, SettingsPanel } from './SettingsPanel';
const time = (ms: number) => `${Math.floor(ms / 60000).toString().padStart(2, '0')}:${Math.floor(ms / 1000 % 60).toString().padStart(2, '0')}`;
const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
const problem = (e: unknown) => Alert.alert('Не удалось выполнить', e instanceof Error ? e.message : String(e));
export function RetroCameraScreen() {
    const cameraRef = useRef<Camera>(null);
    const { settings, loaded, error: settingsError, update } = useAppSettings();
    const selectedCamera = cameraById(settings.cameraId);
    const profile = useMemo(() => ({ ...selectedCamera, filterConfig: resolveEffect(selectedCamera.filterConfig, settings.strength) }), [selectedCamera, settings.strength]);
    const session = useRecorderSession(profile, cameraRef, { quality: settings.quality, aspect: settings.aspect, audioMode: settings.audioMode, dateEnabled: settings.dateEnabled, dateText: settings.dateText, showRec: settings.showRec });
    const [mode, setMode] = useState<'photo' | 'video'>('photo');
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [libraryOpen, setLibraryOpen] = useState(false);
    const [library, setLibrary] = useState<SavedMedia[]>([]);
    const [libraryFilter,setLibraryFilter]=useState<'all'|'photo'|'video'>('all');
    const visibleLibrary=library.filter(item=>libraryFilter==='all'||item.type===libraryFilter);
    const [busy, setBusy] = useState('');
    const [layout, setLayout] = useState<PhotoLayout>('single');
    const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
    const [countdown, setCountdown] = useState(0);
    const [preview, setPreview] = useState('');
    const [format, setFormat] = useState({ width: 0, height: 0 });
    const [cameraGeneration, setCameraGeneration] = useState(0);
    const [clock, setClock] = useState(Date.now());
    const [resumeDecided, setResumeDecided] = useState(false);
    const resumeAsked = useRef(false);
    const photoCancel = useRef(false);
    const operation = useRef(false);
    const photosRef = useRef(settings.photoDraft);
    photosRef.current = settings.photoDraft;
    const device = useCameraHardware(settings.position);
    const recording = session.state === 'recording';
    const processing = ['starting', 'finalizing', 'exporting'].includes(session.state);
    const locked = recording || processing || !!busy;
    const qualities = useMemo(() => { if (!device)
        return [] as Quality[]; return (['720', '1080', '4k'] as Quality[]).filter(q => { const n = q === '4k' ? 3840 : q === '1080' ? 1920 : 1280; return device.formats.some(f => Math.max(f.videoWidth, f.videoHeight) >= n && Math.min(f.videoWidth, f.videoHeight) >= n * 9 / 16); }); }, [device]);
    const onFormat = useCallback((width: number, height: number) => setFormat({ width, height }), []);
    const changeSettings = (patch: Partial<AppSettings>) => { if (locked)
        return; update(patch); };
    useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 1000); return () => clearInterval(timer); }, []);
    useEffect(() => { const sub = AppState.addEventListener('change', state => { if (state !== 'active')
        photoCancel.current = true; }); return () => sub.remove(); }, []);
    useEffect(() => { if (!loaded || !device || !qualities.length || qualities.includes(settings.quality))
        return; const fallback = qualities.includes('1080') ? '1080' : qualities[qualities.length - 1]; update({ quality: fallback }); Alert.alert('Качество камеры', `Эта камера не поддерживает выбранный режим. Включено ${fallback === '4k' ? '4K' : fallback === '1080' ? 'Full HD' : '720p'}.`); }, [loaded, device, qualities, settings.quality]);
    const run = async (label: string, action: () => Promise<void>) => { if (operation.current)
        return; operation.current = true; setBusy(label); try {
        await action();
    }
    catch (e) {
        problem(e);
    }
    finally {
        operation.current = false;
        setBusy('');
        setCountdown(0);
    } };
    const newSession = async () => { if (!await session.clear())
        throw new Error('Не удалось очистить черновик'); if (!await session.reset())
        throw new Error('Не удалось начать новую съёмку'); setResumeDecided(true); };
    const confirmClear = () => Alert.alert('Начать новую съёмку?', 'Куски текущего черновика будут удалены из приложения. Уже сохранённые видео в галерее останутся.', [{ text: 'Отмена', style: 'cancel', onPress: () => setResumeDecided(true) }, { text: 'Удалить куски', style: 'destructive', onPress: () => { void run('Очищаем съёмку…', newSession); } }]);
    useEffect(() => {
        if (!session.restored || !loaded || resumeAsked.current)
            return;
        resumeAsked.current = true;
        if (!session.chunks.length) {
            setResumeDecided(true);
            return;
        }
        Alert.alert('Продолжить прежнюю съёмку?', `В черновике ${session.chunks.length} кусков. Можно продолжить или начать с пустой ленты.`, [{ text: 'Продолжить', onPress: () => { setMode('video'); setResumeDecided(true); } }, { text: 'Новая съёмка', onPress: () => { confirmClear(); } }], { cancelable: false });
    }, [session.restored, loaded]);
    const removeChunk = (chunk: RecordedChunk) => Alert.alert('Удалить этот кусок?', `Кусок длиной ${(chunk.durationMs / 1000).toFixed(1)} с будет удалён из черновика.`, [{ text: 'Отмена', style: 'cancel' }, { text: 'Удалить', style: 'destructive', onPress: () => { void run('Удаляем кусок…', async () => { if (!await session.deleteChunk(chunk.id))
                throw new Error('Не удалось удалить кусок'); }); } }]);
    const saveVideo = () => run('Сохраняем видео с эффектом…', async () => { const result = await session.exportAndStitch(); if (!result.success)
        throw new Error(result.error); Alert.alert('Видео сохранено', `Файл ${result.width ?? '?'} × ${result.height ?? '?'}${result.hasAudio ? ' · со звуком' : ' · без звука'}. Ролик находится в альбоме YAi Retro Camera. Исходные куски остаются в черновике.`, [{ text: 'Открыть', onPress: () => { void RetroExport.openVideo(result.outputUri).catch(problem); } }, { text: 'Новая съёмка', onPress: confirmClear }, { text: 'Готово' }]); });
    const capture = () => run(layout === 'strip' ? 'Фотобудка: четыре кадра' : 'Снимаем фото…', async () => {
        if (!cameraRef.current || !session.ready)
            throw new Error('Дождитесь готовности камеры');
        photoCancel.current = false;
        const results: string[] = [];
        const count = layout === 'strip' ? 4 : 1;
        for (let i = 0; i < count; i++) {
            if (count > 1)
                for (let n = 3; n > 0; n--) {
                    if (photoCancel.current)
                        break;
                    setCountdown(n);
                    await wait(1000);
                }
            ;
            if (photoCancel.current)
                break;
            setCountdown(0);
            const photo = await cameraRef.current.takePhoto({ enableShutterSound: false });
            const imported = await RetroExport.importMedia(photo.path, 'photo');
            results.push(imported.uri);
            const nextPhotos = [...photosRef.current, imported.uri];
            await RetroExport.saveSettings(JSON.stringify({ ...settings, photoDraft: nextPhotos }));
            photosRef.current = nextPhotos;
            update({ photoDraft: nextPhotos });
            setSelectedPhotos([...results]);
        }
    });
    const importMedia = () => run('Открываем выбранные файлы…', async () => {
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: mode === 'video' ? ['videos'] : ['images'], allowsMultipleSelection: true, quality: 1 });
        if (result.canceled)
            return;
        const photoUris: string[] = [];
        for (const asset of result.assets) {
            const item = await RetroExport.importMedia(asset.uri, mode === 'video' ? 'video' : 'photo');
            if (mode === 'video') {
                if (!await session.importClip(item))
                    throw new Error('Не удалось добавить видео');
                setResumeDecided(true);
            }
            else
                photoUris.push(item.uri);
        }
        if (photoUris.length) {
            const nextPhotos = [...photosRef.current, ...photoUris];
            await RetroExport.saveSettings(JSON.stringify({ ...settings, photoDraft: nextPhotos }));
            photosRef.current = nextPhotos;
            update({ photoDraft: nextPhotos });
            setSelectedPhotos(photoUris.slice(-4));
        }
    });
    const removePhoto = (uri: string) => Alert.alert('Удалить фото из черновика?', 'Сохранённые в галерее работы не удаляются.', [{ text: 'Отмена', style: 'cancel' }, { text: 'Удалить', style: 'destructive', onPress: () => { void run('Удаляем фото…', async () => { const next = photosRef.current.filter(x => x !== uri); await RetroExport.saveSettings(JSON.stringify({ ...settings, photoDraft: next })); update({ photoDraft: next }); setSelectedPhotos(v => v.filter(x => x !== uri)); await RetroExport.deleteSource(uri); }); } }]);
    const clearPhotos = () => Alert.alert('Очистить все фото черновика?', 'Сохранённые фото в галерее останутся.', [{ text: 'Отмена', style: 'cancel' }, { text: 'Очистить', style: 'destructive', onPress: () => { void run('Очищаем фото…', async () => { const old = [...photosRef.current]; await RetroExport.saveSettings(JSON.stringify({ ...settings, photoDraft: [] })); update({ photoDraft: [] }); setSelectedPhotos([]); for (const uri of old)
                await RetroExport.deleteSource(uri); }); } }]);
    const renderPhoto = (isPreview: boolean) => run(isPreview ? 'Готовим предпросмотр…' : 'Сохраняем фото…', async () => {
        const chosen = selectedPhotos.length ? selectedPhotos : settings.photoDraft.slice(-1);
        const uris = layout === 'single' || layout === 'polaroid' ? chosen.slice(-1) : chosen;
        if (!uris.length)
            throw new Error('Сначала снимите или выберите фото');
        const result = await RetroExport.renderPhoto({ ...profile.filterConfig, inputUris: uris, layout, preview: isPreview, dateEnabled: settings.dateEnabled, dateText: settings.dateText, aspect: settings.aspect });
        if (isPreview) {
            setPreview(result.outputUri);
            return;
        }
        Alert.alert('Фото сохранено', `Размер ${result.width} × ${result.height}. Альбом YAi Retro Camera.`, [{ text: 'Открыть', onPress: () => { void RetroExport.openVideo(result.outputUri).catch(problem); } }, { text: 'Готово' }]);
    });
    const showLibrary = () => run('Загружаем сохранённые работы…', async () => { setLibrary(await RetroExport.listMedia()); setLibraryOpen(true); });
    const deleteSaved = (items: SavedMedia[]) => Alert.alert(items.length === 1 ? 'Удалить сохранённую работу?' : 'Удалить все сохранённые работы?', `Файлы будут удалены из галереи телефона. Это ${items.length} работ YAi Retro Camera, включая прежние тестовые ролики. Чужие файлы не затрагиваются.`, [{ text: 'Отмена', style: 'cancel' }, { text: 'Удалить', style: 'destructive', onPress: () => { void run('Удаляем сохранённые работы…', async () => { for (const item of items)
                await RetroExport.deleteMedia(item.uri); setLibrary(await RetroExport.listMedia()); }); } }]);
    const checkAudio = (chunk: RecordedChunk) => run('Проверяем звук исходного куска…', async () => { const info = await RetroExport.analyzeAudio(chunk.uri); Alert.alert('Звук исходника', info.hasAudio ? `Звуковая дорожка есть.\nСредний уровень: ${info.rmsDb.toFixed(1)} дБ\nПик: ${info.peakDb.toFixed(1)} дБ\n${info.sampleRate} Гц · ${info.channels} кан.\n${info.rmsDb < -45 ? 'Запись очень тихая. Проверьте голос вблизи телефона.' : 'Прослушайте исходник, чтобы оценить разборчивость.'}` : 'В этом куске нет звуковой дорожки.', [{ text: 'Прослушать', onPress: () => { void RetroExport.openVideo(chunk.uri).catch(problem); } }, { text: 'Готово' }]); });
    const modeChange = (next: 'photo' | 'video') => { if (locked)
        return;  setMode(next); };
    const takeVideo = async () => { if (!resumeDecided || !!busy)
        return; try {
        if (recording)
            await session.pause();
        else if (!await session.start())
            throw new Error('Не удалось начать запись. Проверьте разрешения.');
    }
    catch (e) {
        problem(e);
    } };
    const retro = settings.theme === 'retro';
    const accent = selectedCamera.accent ?? '#edbc87';
    return <SafeAreaView style={[s.root, retro && { backgroundColor: '#2b241d' }]}><StatusBar barStyle="light-content" backgroundColor={retro ? '#2b241d' : '#11151d'}/>
  <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
  <View style={s.header}><Image source={require('../../assets/brand/icon.png')} style={s.logo}/><View style={{ flex: 1 }}><Text style={s.brand}>YAi <Text style={{ color: accent }}>RETRO</Text></Text><Text style={s.subBrand}>{retro ? 'ПЛЁНКА · КАССЕТА · МОМЕНТ' : 'Сохраняй моменты по-своему'}</Text></View><TouchableOpacity disabled={locked} onPress={() => setSettingsOpen(true)}><Text style={s.headerAction}>Настройки</Text></TouchableOpacity></View>
  <View style={s.modeBar}><Choice label="Фото" selected={mode === 'photo'} disabled={locked} onPress={() => modeChange('photo')}/><Choice label="Видео" selected={mode === 'video'} disabled={locked} onPress={() => modeChange('video')}/><View style={{ flex: 1 }}/><TouchableOpacity disabled={locked} onPress={() => {  update({ position: settings.position === 'back' ? 'front' : 'back' }); }}><Text style={s.headerAction}>↻ Камера</Text></TouchableOpacity></View>
  <View style={[s.viewfinder, retro && s.retroFinder]}>
   <RetroCameraPreview key={cameraGeneration} cameraProfile={profile} cameraRef={cameraRef} isActive={session.foreground && (!busy || busy.startsWith('Снимаем') || busy.startsWith('Фотобудка')) && session.state !== 'exporting'} onReady={session.onCameraReady} onError={session.onCameraError} quality={settings.quality} position={settings.position} mode={mode} audio={settings.audioMode !== 'mute'} onFormat={onFormat}/>
   <View pointerEvents="none" style={s.topOverlay}><Text style={s.finderTag}>{selectedCamera.name}</Text><Text style={[s.finderTag, recording && { color: '#ff625f' }]}>{recording ? '● REC ' : mode === 'photo' ? 'ФОТО ' : 'ВИДЕО '}{recording ? time(session.currentRecordingTimeMs) : ''}</Text></View>
   {settings.dateEnabled && <Text style={s.date}>{settings.dateText || new Date(clock).toLocaleString('ru-RU')}</Text>}
   {!!countdown && <Text style={s.countdown}>{countdown}</Text>}
   {(!!busy || processing) && <View style={s.progress}><ActivityIndicator color={accent}/><Text style={s.progressText}>{busy || 'Сохраняем видео…'}</Text>{busy.startsWith('Фотобудка') && <TouchableOpacity onPress={() => { photoCancel.current = true; }}><Text style={s.headerAction}>Остановить фотобудку</Text></TouchableOpacity>}</View>}
  </View>
  <View style={s.infoRow}><Text style={s.info}>{format.width ? `${format.width} × ${format.height}` : 'Авто · размер при сохранении'}{mode === 'video' ? ` · ${settings.quality === '4k' ? '4K' : settings.quality === '1080' ? 'Full HD' : '720p'}` : ''}</Text><Text style={s.info}>{mode === 'video' ? (settings.audioMode === 'mute' ? 'Без звука' : settings.audioMode === 'vintage' ? 'Плёночный звук' : 'Микрофон включён') : 'Фото · JPEG высокого качества'}</Text></View>
  {(session.errorMessage || settingsError) && <TouchableOpacity onPress={() => { setCameraGeneration(v => v + 1); if (!session.restored)
        void session.initialize(); }}><Text style={s.error}>{session.errorMessage || settingsError} · Повторить</Text></TouchableOpacity>}
  <ScrollView horizontal style={{ height: 62, maxHeight: 62, flexGrow: 0 }} showsHorizontalScrollIndicator={false} contentContainerStyle={s.cameraList}>{cameras.map((c, i) => <TouchableOpacity key={c.id} disabled={locked} onPress={() => update({ cameraId: c.id })} style={[s.cameraCard, c.id === selectedCamera.id && { borderColor: c.accent, backgroundColor: retro ? '#4b3d2c' : '#323440' }]}><Text style={[s.cameraGlyph, { color: c.accent }]}>{['◉', '▣', '▰', '▤', '▧', '▢'][i]}</Text><Text style={s.cameraName}>{c.name}</Text></TouchableOpacity>)}</ScrollView>
  <View style={s.strength}><Text style={s.info}>Сила эффекта</Text><Slider disabled={locked} style={{ flex: 1, height: 28 }} minimumValue={0} maximumValue={1} value={settings.strength} onValueChange={strength => update({ strength })} minimumTrackTintColor={accent} maximumTrackTintColor="#444b58" thumbTintColor={accent}/><Text style={s.info}>{Math.round(settings.strength * 100)}%</Text></View>
  {mode === 'video' ? <><View style={s.section}><Text style={s.sectionTitle}>Лента · {session.chunks.length} · {time(session.totalDurationMs)}</Text><TouchableOpacity disabled={locked || !session.chunks.length} onPress={confirmClear}><Text style={s.delete}>Очистить всё</Text></TouchableOpacity></View>
   <View style={{ height: session.chunks.length ? 134 : 42 }}><ChunkFilmstrip chunks={session.chunks} disabled={locked} onOpen={c => { Alert.alert('Исходный кусок', 'Исходник без эффектов: так можно отдельно проверить качество и звук.', [{ text: 'Открыть', onPress: () => { void RetroExport.openVideo(c.uri).catch(problem); } }, { text: 'Проверить звук', onPress: () => { void checkAudio(c); } }, { text: 'Закрыть' }]); }} onDelete={removeChunk} onMove={(id, d) => { void run('Меняем порядок…', async () => { if (!await session.moveChunk(id, d))
            throw new Error('Не удалось изменить порядок'); }); }}/></View>
  </> : <><ScrollView horizontal style={{ height: 42, maxHeight: 42, flexGrow: 0 }} showsHorizontalScrollIndicator={false} contentContainerStyle={s.photoLayouts}>{(['single', 'polaroid', 'strip', 'collage'] as PhotoLayout[]).map((v, i) => <Choice key={v} label={['Фото', 'Полароид', 'Фотобудка ×4', 'Коллаж'][i]} selected={layout === v} disabled={locked} onPress={() => setLayout(v)}/>)}</ScrollView>
   {!!settings.photoDraft.length && <><View style={s.section}><Text style={s.sectionTitle}>Фото · выбрано {selectedPhotos.length}</Text><TouchableOpacity disabled={locked} onPress={clearPhotos}><Text style={s.delete}>Очистить</Text></TouchableOpacity></View><FlatList horizontal style={{ height: 78, flexGrow: 0 }} data={settings.photoDraft} keyExtractor={uri => uri} contentContainerStyle={s.photoList} renderItem={({ item }) => <View><TouchableOpacity disabled={locked} onPress={() => setSelectedPhotos(values => values.includes(item) ? values.filter(x => x !== item) : [...values, item].slice(-4))}><Image source={{ uri: item }} style={[s.photoThumb, selectedPhotos.includes(item) && { borderColor: accent }]}/></TouchableOpacity><TouchableOpacity disabled={locked} onPress={() => removePhoto(item)} style={s.photoDelete}><Text style={{ color: '#fff' }}>×</Text></TouchableOpacity></View>}/></>}
  </>}
  <View style={s.captureRow}><TouchableOpacity disabled={locked} onPress={() => { void importMedia(); }} style={s.sideButton}><Text style={s.sideIcon}>＋</Text><Text style={s.buttonLabel}>Импорт</Text></TouchableOpacity>
   <TouchableOpacity accessibilityLabel={mode === 'photo' ? 'Сделать фото' : recording ? 'Пауза' : 'Начать запись'} disabled={processing || !!busy || !session.ready || !loaded || !resumeDecided} onPress={() => { if (mode === 'photo')
        void capture();
    else
        void takeVideo(); }} style={[s.shutter, { borderColor: accent }, (!session.ready || !!busy) && { opacity: .45 }]}><View style={[s.shutterInner, { backgroundColor: mode === 'photo' ? '#f3eee4' : '#df4d4d' }, recording && { borderRadius: 5, width: 23, height: 27 }]}/></TouchableOpacity>
   {mode === 'video' && recording ? <TouchableOpacity onPress={() => { void session.stop(); }} style={s.sideButton}><Text style={[s.sideIcon, { color: '#e66962' }]}>■</Text><Text style={s.buttonLabel}>Стоп</Text></TouchableOpacity> : <TouchableOpacity disabled={locked} onPress={() => { void showLibrary(); }} style={s.sideButton}><Text style={s.sideIcon}>▧</Text><Text style={s.buttonLabel}>Мои работы</Text></TouchableOpacity>}
  </View>
  <View style={s.footer}>{mode === 'video' ? <TouchableOpacity disabled={locked || !session.chunks.length} onPress={() => { void saveVideo(); }} style={[s.saveButton, (!session.chunks.length || locked) && { opacity: .4 }]}><Text style={s.saveText}>Склеить и сохранить видео</Text></TouchableOpacity> : <><TouchableOpacity disabled={locked || !settings.photoDraft.length} onPress={() => { void renderPhoto(true); }} style={s.previewButton}><Text style={s.buttonLabel}>Предпросмотр</Text></TouchableOpacity><TouchableOpacity disabled={locked || !settings.photoDraft.length} onPress={() => { void renderPhoto(false); }} style={[s.saveButton, { flex: 1 }, !settings.photoDraft.length && { opacity: .4 }]}><Text style={s.saveText}>Сохранить фото</Text></TouchableOpacity></>}</View>
  </ScrollView>
  <SettingsPanel visible={settingsOpen} onClose={() => setSettingsOpen(false)} settings={settings} update={changeSettings} qualities={qualities}/>
  <Modal visible={!!preview} transparent onRequestClose={() => setPreview('')}><View style={s.modal}><Image source={{ uri: preview }} style={{ flex: 1, width: '100%' }} resizeMode="contain"/><TouchableOpacity style={[s.saveButton, { flex: 0 }]} onPress={() => setPreview('')}><Text style={s.saveText}>Вернуться к редактированию</Text></TouchableOpacity></View></Modal>
  <Modal visible={libraryOpen} animationType="slide" onRequestClose={() => setLibraryOpen(false)}><SafeAreaView style={s.root}><View style={s.libraryHeader}><Text style={s.libraryTitle}>Мои работы</Text><TouchableOpacity onPress={() => setLibraryOpen(false)}><Text style={s.headerAction}>Готово</Text></TouchableOpacity></View><Text style={s.libraryHint}>Сохранённые фото и видео YAi Retro Camera. Удаление здесь удаляет файл и из галереи телефона.</Text>
   <View style={{flexDirection:'row',gap:8,paddingHorizontal:20,paddingBottom:12}}>{(['all','photo','video'] as const).map((value,i)=><Choice key={value} label={['Все','Фото','Видео'][i]} selected={libraryFilter===value} disabled={!!busy} onPress={()=>setLibraryFilter(value)}/>)}</View>
   <FlatList data={visibleLibrary} keyExtractor={item => item.uri} ListEmptyComponent={<Text style={s.emptyLibrary}>Пока нет сохранённых работ.</Text>} renderItem={({ item }) => <View style={s.mediaRow}>{item.type === 'photo' ? <Image source={{ uri: item.uri }} style={s.mediaThumb}/> : <View style={[s.mediaThumb, { alignItems: 'center', justifyContent: 'center' }]}><Text style={s.sideIcon}>▶</Text></View>}<View style={{ flex: 1 }}><Text style={s.mediaTitle}>{item.type === 'video' ? 'Видео' : 'Фото'}</Text><Text style={s.info}>{new Date(item.createdAt).toLocaleString('ru-RU')} · {(item.sizeBytes / 1000000).toFixed(1)} МБ</Text><View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}><TouchableOpacity disabled={!!busy} onPress={() => { void RetroExport.openVideo(item.uri).catch(problem); }}><Text style={s.headerAction}>Открыть</Text></TouchableOpacity><TouchableOpacity disabled={!!busy} onPress={() => deleteSaved([item])}><Text style={s.delete}>Удалить</Text></TouchableOpacity></View></View></View>}/>
   {!!busy && <ActivityIndicator color={accent}/>}<TouchableOpacity disabled={!!busy || !visibleLibrary.length} onPress={() => deleteSaved(visibleLibrary)} style={s.clearLibrary}><Text style={s.delete}>{libraryFilter==='video'?'Удалить все сохранённые видео':libraryFilter==='photo'?'Удалить все сохранённые фото':'Удалить все сохранённые работы'}</Text></TouchableOpacity>
  </SafeAreaView></Modal>
 </SafeAreaView>;
}
const s = StyleSheet.create({ root: { flex: 1, backgroundColor: '#11151d' }, header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 17, paddingTop: 10, paddingBottom: 9, gap: 10 }, logo: { width: 39, height: 39, borderRadius: 11 }, brand: { fontSize: 19, fontWeight: '800', color: '#f5f1e9', letterSpacing: 2 }, subBrand: { fontSize: 10, color: '#8d95a5', marginTop: 2 }, headerAction: { color: '#e9b77c', fontSize: 12, fontWeight: '600', paddingVertical: 8 }, modeBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 7, paddingBottom: 9 }, viewfinder: { flex: 1, minHeight: 180, marginHorizontal: 12, borderRadius: 19, overflow: 'hidden', backgroundColor: '#000' }, retroFinder: { borderWidth: 6, borderColor: '#554638', borderRadius: 7 }, topOverlay: { position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between' }, finderTag: { color: '#fff', fontSize: 11, fontWeight: '600', backgroundColor: '#0007', padding: 6, borderRadius: 6 }, date: { position: 'absolute', left: 20, bottom: 18, color: '#ffbd65', fontFamily: 'monospace', fontSize: 12, textShadowColor: '#000', textShadowRadius: 3 }, countdown: { position: 'absolute', top: '30%', width: '100%', textAlign: 'center', fontSize: 74, color: '#fff', fontWeight: '700' }, progress: { ...StyleSheet.absoluteFillObject, backgroundColor: '#0008', alignItems: 'center', justifyContent: 'center', padding: 25 }, progressText: { color: '#fff', textAlign: 'center', marginTop: 12 }, infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 7, gap: 8 }, info: { color: '#909aab', fontSize: 10 }, cameraList: { paddingHorizontal: 14, gap: 7, paddingBottom: 2 }, cameraCard: { width: 88, height: 57, borderRadius: 11, borderWidth: 1, borderColor: '#343b49', alignItems: 'center', justifyContent: 'center' }, cameraGlyph: { fontSize: 21 }, cameraName: { fontSize: 10, color: '#eee', marginTop: 2 }, strength: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 6, height: 33 }, section: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 6, alignItems: 'center' }, sectionTitle: { color: '#c9cbd0', fontSize: 11, fontWeight: '600' }, delete: { color: '#f5a194', fontSize: 11, paddingVertical: 5 }, captureRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', paddingTop: 10, paddingBottom: 6 }, sideButton: { alignItems: 'center', width: 95 }, sideIcon: { color: '#cbd1dc', fontSize: 25 }, buttonLabel: { fontSize: 10, color: '#c8ced9', marginTop: 5, textAlign: 'center' }, shutter: { width: 67, height: 67, borderRadius: 34, borderWidth: 3, alignItems: 'center', justifyContent: 'center' }, shutterInner: { width: 52, height: 52, borderRadius: 26 }, footer: { paddingHorizontal: 16, paddingTop: 5, paddingBottom: 12, flexDirection: 'row', gap: 12, alignItems: 'center' }, saveButton: { backgroundColor: '#e9b77c', borderRadius: 12, padding: 13, alignItems: 'center', justifyContent: 'center', flex: 1 }, saveText: { color: '#181a20', fontSize: 12, fontWeight: '700' }, previewButton: { padding: 7 }, error: { color: '#ffb1a6', fontSize: 11, paddingHorizontal: 16, paddingBottom: 6 }, photoLayouts: { paddingHorizontal: 14, gap: 6, paddingBottom: 5 }, photoList: { paddingHorizontal: 14, gap: 8 }, photoThumb: { width: 66, height: 68, borderRadius: 8, borderWidth: 2, borderColor: '#414958' }, photoDelete: { position: 'absolute', right: 0, top: 0, backgroundColor: '#852f2f', width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, modal: { flex: 1, backgroundColor: '#111', padding: 20, paddingBottom: 28 }, libraryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 }, libraryTitle: { fontSize: 23, color: '#fff', fontWeight: '700' }, libraryHint: { color: '#9da5b2', fontSize: 12, lineHeight: 18, paddingHorizontal: 20, paddingBottom: 15 }, emptyLibrary: { color: '#9da5b2', textAlign: 'center', padding: 40 }, mediaRow: { flexDirection: 'row', gap: 14, padding: 15, borderBottomWidth: 1, borderBottomColor: '#282f3c' }, mediaThumb: { width: 70, height: 76, backgroundColor: '#29303b', borderRadius: 9 }, mediaTitle: { fontSize: 15, color: '#eee', fontWeight: '600', marginBottom: 5 }, clearLibrary: { alignItems: 'center', padding: 18 } });
