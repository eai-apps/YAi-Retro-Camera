# Источники и лицензии

В поставляемых исходниках нет внешних фото, LUT, текстур, музыки или звуков. Каталоги luts/textures/sounds зарезервированы для последующих этапов. Зерно вычисляется процедурно. `effects/warm-film.glsl` и генератор диалектов — код проекта, внешних шейдеров не копировали. Исходную hash-формулу Antigravity заменили простой собственной формулой на основе модульной арифметики.

Прямые runtime-компоненты (полные тексты лицензий находятся в соответствующих npm-пакетах/репозиториях):

| Компонент | Версия | Лицензия | Официальный источник |
|---|---|---|---|
| Expo | 52.0.49 | MIT | https://github.com/expo/expo |
| expo-modules-core | 2.2.3 | MIT | https://github.com/expo/expo/tree/sdk-52/packages/expo-modules-core |
| expo-asset | 11.0.5 | MIT | https://github.com/expo/expo/tree/sdk-52/packages/expo-asset |
| React | 18.3.1 | MIT | https://github.com/facebook/react |
| React Native | 0.76.9 | MIT | https://github.com/facebook/react-native |
| VisionCamera | 4.7.3 | MIT | https://github.com/mrousavy/react-native-vision-camera |
| React Native Skia | 1.5.0 | MIT | https://github.com/Shopify/react-native-skia |
| Worklets Core | 1.6.3 | MIT | https://github.com/margelo/react-native-worklets-core |
| Reanimated | 3.16.7 | MIT | https://github.com/software-mansion/react-native-reanimated |
| AndroidX Media3 Transformer / Effect / Common / ExoPlayer | 1.5.0 | Apache-2.0 | https://github.com/androidx/media/tree/1.5.0 |
| Skia / CanvasKit (прямая проверка шейдера использует транзитивный CanvasKit из Skia) | по package-lock.json | BSD-3-Clause / лицензии третьих компонентов Skia | https://github.com/google/skia |

Android/Expo-шаблон: официальный `expo-template-bare-minimum` SDK 52, MIT. JDK/SDK/NDK — инструменты сборки, не сторонний видеосервис. Полный npm-граф зафиксирован в package-lock.json. Dev-инструменты Jest, ts-jest, TypeScript, Babel — по лицензиям их пакетов; их код не добавляется в runtime приложения как продуктовая функция.

FFmpeg/FFmpegKit, GPL-код, платные SDK и закрытый код Blackmagic Camera не добавлялись. Это реестр используемых компонентов, а не утверждение о проведённой юридической экспертизе всех транзитивных пакетов. При добавлении ресурса обязательно записывать отдельные источник, лицензию и условия атрибуции.

Версия 0.2.0: собственные пятиузловые тональные кривые/LUT, процедурные пыль/царапины/засветки/рамки и иконка scripts/generate-icon.cjs; внешних изображений/звуков нет. expo-image-picker 16.0.6 — MIT (https://github.com/expo/expo/tree/sdk-52/packages/expo-image-picker); @react-native-community/slider 4.5.5 — MIT (https://github.com/callstack/react-native-slider); AndroidX ExifInterface 1.3.7 — Apache-2.0. ffmpeg используется только инструментом CI для синтетических тестовых файлов; в APK/исходники библиотеки ffmpeg не включены.

Локальная поправка VisionCamera 4.7.3 (MIT): scripts/patch-vision-camera.cjs добавляет событие обновления списка камер после асинхронного CameraX init; исходный файл CameraDevicesManager.kt поставляется npm-пакетом, авторские уведомления сохраняются. Версия и точка применения проверяются postinstall, новая версия требует отдельного пересмотра.
Дополнение поправки: в режиме photo=false/video=false не создаётся лишний VideoCapture только ради ImageAnalysis; при photo=true/video=false остаются фото + обработка превью, при video=true видеозапись сохраняется. Это предотвращает лишнюю нагрузку/ошибку комбинации camera surfaces.
Ещё одна часть совместимой поправки VisionCamera: метод getCurrentDevices возвращает актуальный список на её serial camera executor; собственный useCameraHardware читает снимок и подписывается на события, чтобы не зависеть от порядка старта native/JS.
Превью ImageAnalysis ограничено бюджетом экрана (не выше 1920×1080, минимум VGA) через ResolutionFilter. Это сохраняет выбранное качество VideoCapture и позволяет сочетать запись с анализом на устройствах, не поддерживающих два максимальных потока.
Выбор качества VideoCapture ограничен выбранным QualitySelector без скрытого перехода на другое качество. Камера без описанных видеорежимов оставляет доступной фотосъёмку с автоматическим форматом.
Штатный Preview в режиме совместимости также ограничен размером экрана; разрешение записываемого VideoCapture остаётся выбранным. Совместимый режим отмечен в интерфейсе и сохраняет оригинальный поток для последующего наложения эффекта Media3.
