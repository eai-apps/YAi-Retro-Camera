import { CameraProfile } from './types';

/**
 * Профиль камеры «Тёплая плёнка» (Warm Film) — Этап 0
 *
 * Декларативный профиль:
 * - Тёплый ламповый оттенок с мягким золотисто-янтарным тоном
 * - Умеренный контраст для кинематографичного динамического диапазона
 * - Живое процедурное зерно без использования растровых текстур
 * - Бесплатная камера (isPaid: false)
 */
export const warmFilmCamera: CameraProfile = {
  id: 'warm-film',
  name: 'Тёплая плёнка',
  description: 'Классический плёночный стиль 90-х: мягкий тёплый оттенок и живое серебряное зерно.',
  isPaid: false,
  modes: ['video'],
  filterConfig: {
    warmth: 0.65,
    contrast: 1.15,
    saturation: 1.08,
    grainIntensity: 0.16,
    grainScale: 1.25,
    grainSpeed: 24.0,
  },
};
