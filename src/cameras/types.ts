/**
 * Типы конфигурации ретро-камер (YAi Retro Camera)
 */

export type CameraCaptureMode = 'video' | 'photo';

export interface CameraFilterConfig {
  /** Уровень тепла (0.0 = нейтральный, 1.0 = выраженная тёплая плёнка) */
  warmth: number;
  /** Коэффициент контрастности (1.0 = нейтральный, > 1.0 = усиленный контраст) */
  contrast: number;
  /** Насыщенность цвета (1.0 = нейтральная) */
  saturation: number;
  /** Интенсивность процедурного зерна (0.0 = нет зерна, 0.25 = выраженное зерно 16мм) */
  grainIntensity: number;
  /** Масштаб зерна (1.0 = мелкое зерно, 2.0 = крупное зерно 8мм) */
  grainScale: number;
  /** Скорость смены зерна по времени (кадров в секунду) */
  grainSpeed: number;
}

export interface CameraProfile {
  id: string;
  name: string;
  description: string;
  isPaid: boolean;
  modes: CameraCaptureMode[];
  filterConfig: CameraFilterConfig;
}
