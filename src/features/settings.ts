import { useEffect, useState } from 'react';
import { RetroExport } from '../../modules/retro-export';
export type Quality = '720' | '1080' | '4k';
export type PhotoLayout = 'single' | 'polaroid' | 'strip' | 'collage';
export interface AppSettings {
    cameraId: string;
    strength: number;
    quality: Quality;
    audioMode: 'live' | 'vintage' | 'mute';
    theme: 'modern' | 'retro';
    aspect: 'original' | '9:16' | '1:1' | '16:9';
    dateEnabled: boolean;
    dateText: string;
    showRec: boolean;
    position: 'front' | 'back';
    photoDraft: string[];
}
export const defaultSettings: AppSettings = { cameraId: 'warm-film', strength: 1, quality: '1080', audioMode: 'live', theme: 'modern', aspect: '9:16', dateEnabled: true, dateText: '', showRec: true, position: 'back', photoDraft: [] };
export function parseSettings(raw: unknown): AppSettings {
    const v = raw && typeof raw === 'object' ? raw as Partial<AppSettings> : {};
    return { ...defaultSettings, ...v, cameraId: typeof v.cameraId === 'string' ? v.cameraId : defaultSettings.cameraId,
        strength: typeof v.strength === 'number' && Number.isFinite(v.strength) ? Math.max(0, Math.min(1, v.strength)) : 1,
        quality: ['720', '1080', '4k'].includes(v.quality ?? '') ? v.quality! : defaultSettings.quality,
        audioMode: ['live', 'vintage', 'mute'].includes(v.audioMode ?? '') ? v.audioMode! : 'live',
        theme: v.theme === 'retro' ? 'retro' : 'modern', aspect: ['original', '9:16', '1:1', '16:9'].includes(v.aspect ?? '') ? v.aspect! : '9:16',
        dateEnabled: v.dateEnabled !== false, showRec: v.showRec !== false, dateText: typeof v.dateText === 'string' ? v.dateText.slice(0, 48) : '',
        position: v.position === 'front' ? 'front' : 'back', photoDraft: Array.isArray(v.photoDraft) ? v.photoDraft.filter(x => typeof x === 'string' && x.startsWith('file://')) : [] };
}
export function useAppSettings() {
    const [settings, set] = useState(defaultSettings);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => { let alive = true; void RetroExport.loadSettings().then(raw => { if (alive)
        set(parseSettings(raw ? JSON.parse(raw) : null)); }).catch(e => { if (alive)
        setError(String(e)); }).finally(() => { if (alive)
        setLoaded(true); }); return () => { alive = false; }; }, []);
    useEffect(() => { if (!loaded)
        return; const timer = setTimeout(() => { void RetroExport.saveSettings(JSON.stringify(settings)).catch(e => setError(String(e))); }, 350); return () => clearTimeout(timer); }, [settings, loaded]);
    return { settings, loaded, error, update: (patch: Partial<AppSettings>) => set(value => parseSettings({ ...value, ...patch })) };
}
