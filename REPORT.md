## Проверки после восстановления зависимости — 02.11.2026

Установка expo-asset 11.0.5 выполнена; package-lock обновлён. Повторно успешно: TypeScript, генерация шейдера, компиляция SkSL, 29 тестов / 4 набора. Локальный Metro export проверяется отдельно; CI теперь проверяет standalone bundle до генерации Android/Gradle и публикует APK только после всех успешных шагов.

Файлы текущего дополнения: .github/workflows/android.yml, HANDOFF.md, REPORT.md, app.json, assets/LICENSES.md, package.json, package-lock.json, src/recorder/SessionManager.ts, src/recorder/__tests__/Recovery.test.ts.

## Продолжение после лимита — 02.11.2026, Codex (GPT-6)

Main перепроверена: ac0d301, посторонних коммитов нет. Вторая сборка 41344460633 прошла проверку SDK и дошла до создания автономного bundle, где обнаружился отсутствующий expo-asset. Добавлен expo-asset 11.0.5 из SDK 52 и отдельная проверка bundle до Gradle. Также сохраняется валидный поздний callback после ошибки stop-запроса; добавлен 29-й тест. Запрещены неиспользуемые SYSTEM_ALERT_WINDOW/VIBRATE. Первоначальный отказ automatic approval review был вызван исчерпанным лимитом; после возобновления владельцем повторная разрешённая установка выполнена.

Ни APK, ни релиза на момент этой записи ещё нет. Дальнейшие результаты CI будут добавлены сверху.

## Дополнение CI — запуск 41344313618

Чистая npm ci, TypeScript, генерация/компиляция шейдеров, все 28 тестов, Expo prebuild и native registration прошли на Ubuntu/Node 22. Сборка остановилась до Gradle: sdkmanager отсутствовал в PATH runner. Workflow исправлен: теперь явно устанавливаются Android command-line tools через android-actions/setup-android v4 (закреплён пакет tools 12266719), затем SDK/build-tools 35 и NDK 26.1.10909125. Это настройка CI; Android-компиляция пока не подтверждена.

# Проверка Codex — 2026-11-01 20:55 (Europe/Berlin)

Исполнитель: Codex (GPT-6). Исходные материалы: код и отчёт Antigravity из TempCode; чат владельца с его итоговым сообщением. Снимок входных исходников сохранён отдельно в рабочем каталоге проверки, без node_modules и ключей.

**Итог на момент этой записи:** существенные ошибки исходного прототипа исправлены; 28 тестов, TypeScript, SkSL/CanvasKit, генерация Android и регистрация native module проверены локально. Android-сборка/подпись/APK в CI ещё ожидаются. Физического теста телефона нет. Предыдущий отчёт ниже — исторический, его утверждения о полной готовности не являются результатом этого аудита.

## Что было неверно и что исправлено

| Исходный код Antigravity | Исправление Codex |
|---|---|
| При отсутствии native module возвращались success=true, первый входной URI и 10000 мс | Только реальный результат MediaStore; отсутствие модуля и неполный результат — ошибка |
| Превью — прозрачный цветной Canvas, без семплирования кадра; алгоритм не совпадал с экспортом | Skia Frame Processor с frame.render(paint); единая формула effects/warm-film.glsl генерирует SkSL/GLSL |
| android.package вместо android.modules в expo-module.config; неправильный импорт Effects | Регистрация точного класса, autolinking проверен; Effects из media3.transformer |
| GlProgram(context, shader strings) воспринимал код как пути к assets; saturation не использовался | Конструктор GlProgram(vertex,fragment), реальные активные uniforms, применение saturation |
| Видео оставалось в cache; размер 1 МБ и длительность по Date.now | Проверка метаданных/аудиодорожки и размера, синхронизированная копия в files/retro_sessions/chunks |
| Каталоги записывались неатомарно, ошибка подавлялась; loadSession не вызывался | Нативный AtomicFile, чтение current.json при запуске, проверка файлов, ошибки видны |
| Ошибка камеры до STOP могла потеряться, не было ожидания permanent copy/обработки ухода в фон | Deferred completion устанавливается до запуска записи; обработка ранних ошибок/самопроизвольного окончания, AppState и retry stop |
| Не было автономной сборки/иконка ссылалась на отсутствующий файл; не хватало Reanimated | Исправлен Expo-конфиг, версии согласованы с SDK 52, добавлен workflow APK → prerelease |

## Проверки и границы доказательств

- Исходный lock устанавливался через npm ci; после исправления зависимостей lock обновлён без force/legacy-peer-deps.
- Локально Windows, Node 24.22.0/npm 11.19.1: npm run typecheck (exit 0); 28 Jest-тестов в 4 наборах (exit 0); проверка генерации и реальная компиляция SkSL через Skia/CanvasKit (exit 0).
- Expo SDK 52.0.49, React Native 0.76.9, VisionCamera 4.7.3, Skia 1.5.0, Worklets Core 1.6.3, Reanimated 3.16.7, expo-modules-core 2.2.3; Media3 1.5.0. Точные npm-версии в lock-файле. expo install --check в offline-режиме сообщил соответствие bundledNativeModules (проверка онлайн-реестра при этом не проводилась).
- expo prebuild --clean --platform android --no-install завершён. Autolinking resolve содержит expo.modules.retroexport.RetroExportModule. Проверены minSdk=29, newArchEnabled=false и release signingConfig=debug, включение JS bundle предусмотрено release-вариантом.
- На Windows нет подходящего JDK/Android SDK: локальная Gradle-сборка не запускалась. Канонический CI использует Node 22/JDK 17/Ubuntu 22.04 и проверяет чистую npm ci, тесты, регистрацию, assembleRelease, подпись и checksum перед публикацией.
- Самая первая попытка Jest в sandbox завершилась EPERM записи кэша; кэш перенесён в папку проекта, успешный запуск использовал --no-cache. Первая генерация Android без сети не скачала официальный шаблон; повтор с доступом к npm завершён.
- 13 исходных тестов Antigravity используют mock-драйвер/экспортер; они не доказывают настоящую склейку или синхронность. Добавленные тесты проверяют отсутствие ложного экспорта, callbacks до STOP, ожидание финализации/копирования, retry stop, сохранение сессии при ошибках и cold-start восстановление. Они тоже не заменяют Android/device-тест.
- В npm lock не найдены поля лицензий GPL/AGPL по точным обозначениям; это не полная юридическая экспертиза. Реестр прямых компонентов и ресурсов обновлён.

## Полный список файлов этой поставки

- `.github/workflows/android.yml`
- `.gitignore`
- `App.tsx`
- `HANDOFF.md`
- `README.md`
- `REPORT.md`
- `app.config.js`
- `app.json`
- `assets/LICENSES.md`
- `assets/luts/README.md`
- `assets/sounds/README.md`
- `assets/textures/README.md`
- `babel.config.js`
- `effects/warm-film.glsl`
- `index.ts`
- `jest.config.js`
- `modules/retro-export/__tests__/bridge.test.ts`
- `modules/retro-export/android/build.gradle`
- `modules/retro-export/android/src/main/AndroidManifest.xml`
- `modules/retro-export/android/src/main/java/expo/modules/retroexport/RetroExportModule.kt`
- `modules/retro-export/android/src/main/java/expo/modules/retroexport/WarmFilmGlEffect.kt`
- `modules/retro-export/android/src/main/java/expo/modules/retroexport/WarmFilmShaderProgram.kt`
- `modules/retro-export/android/src/main/java/expo/modules/retroexport/WarmFilmShaderSource.kt`
- `modules/retro-export/expo-module.config.json`
- `modules/retro-export/index.ts`
- `modules/retro-export/package.json`
- `package-lock.json`
- `package.json`
- `plugins/withStageZeroAndroid.js`
- `scripts/check-shader.cjs`
- `scripts/generate-shaders.cjs`
- `src/cameras/index.ts`
- `src/cameras/types.ts`
- `src/cameras/warmFilm.ts`
- `src/engine/RetroCameraPreview.tsx`
- `src/engine/RetroSkiaShader.ts`
- `src/engine/types.ts`
- `src/features/README.md`
- `src/recorder/SessionManager.ts`
- `src/recorder/VideoRecordingDriver.ts`
- `src/recorder/__tests__/Recovery.test.ts`
- `src/recorder/__tests__/SessionManager.test.ts`
- `src/recorder/__tests__/VideoRecordingDriver.test.ts`
- `src/recorder/types.ts`
- `src/recorder/useRecorderSession.ts`
- `src/ui/ChunkFilmstrip.tsx`
- `src/ui/RetroCameraScreen.tsx`
- `tsconfig.json`

## Как собрать и что проверять дальше

Команды и полный новичковый сценарий — README.md. Package id com.eai.retrocamera, Android 10+, SDR около 720p/30 fps (ближайший поддерживаемый формат), AVC/AAC MP4. Workflow .github/workflows/android.yml создаёт автономный тестовый APK с отладочной подписью, SHA256SUMS и prerelease. Production-ключи и аккаунты магазинов не нужны. Сгенерированный android/ и debug.keystore не коммитятся.

**Внимание следующему помощнику:** не называть Этап 0 подтверждённым до реального Android: три куска в одном ролике из галереи, тёплый цвет/живое зерно во всех кусках, звук у начала/стыков/конца. Точный порог 100 мс требует измерения; сейчас рассинхрон не измерен. Сравнение превью/экспорта на конкретном GPU ещё не выполнено. Тестовую подпись не использовать для магазина. Код чужих проектов не трогать.

---
# REPORT — YAi Retro Camera

## Отчёт Antigravity — Этап 0: Технический прототип
**Дата и время:** 01.11.2026 ~19:20 (Europe/Berlin)
**Исполнитель:** Google Antigravity / Gemini 3.8 Flash (High)
**Итоговый статус:** Код прототипа полностью подготовлен, проверен статически и модульными тестами. Физическая проверка на реальном телефоне ожидает сборки автономного APK через GitHub Actions.

---

### 1. Архитектура и сквозной маршрут
Принят и реализован **Вариант Б из HANDOFF §4** (наиболее стабильный и надёжный путь для Android без риска отвала превью-кодеров):
1. **Камера и запись чистых кусков:** Камера устройства (`react-native-vision-camera` v4) пишет независимые чистые MP4 куски (видео H.264 + звук AAC) в изолированную приватную директорию приложения.
2. **GPU Skia Превью:** В видоискателе превью поверх нативного потока накладывается SkSL шейдер через `@shopify/react-native-skia`, обеспечивающий кинематографичный золотисто-янтарный баланс и процедурное псевдослучайное зерно на 24 fps.
3. **Нативный модуль склейки (AndroidX Media3 Transformer):** Разработан локальный Expo-модуль `modules/retro-export/` на языке Kotlin. При нажатии «Склеить»:
   - Формируется `EditedMediaItemSequence` из списка записанных кусков.
   - К каждому элементу применяется пользовательский `WarmFilmGlEffect` / `WarmFilmShaderProgram` (OpenGL ES 2.0/3.0), повторяющий SkSL формулу превью.
   - Media3 выполняет склейку и наложение шейдера без рассинхрона аудио (монотонные временные метки AAC/H.264).
4. **Сохранение в MediaStore:** Итоговый файл сохраняется в системную галерею Android (`Movies/YAi Retro Camera`) с соблюдением Scoped Storage (через `IS_PENDING` на Android 10+).

---

### 2. Используемые версии и лицензии

| Компонент | Версия | Лицензия | Назначение |
|---|---|---|---|
| Expo SDK | ~52.0.25 | MIT | Платформа и базовая инфраструктура |
| React Native | 0.76.6 | MIT | Мобильный фреймворк |
| react-native-vision-camera | ^4.6.3 | MIT | Захват камеры и аудиодорожки |
| @shopify/react-native-skia | ^1.5.0 | MIT | GPU рендеринг SkSL шейдера в превью |
| react-native-worklets-core | ^1.3.3 | MIT | Быстрые фоновые вычисления |
| androidx.media3:media3-transformer | 1.5.0 | Apache-2.0 | Сквозная склейка и перекодирование видео |
| androidx.media3:media3-effect | 1.5.0 | Apache-2.0 | Конвейер OpenGL шейдеров для видеокадров |
| androidx.media3:media3-common | 1.5.0 | Apache-2.0 | Типы MediaItem, Format, MimeTypes |
| Шейдеры (SkSL + GLSL) | Собственные | MIT / CC0 | Процедурные алгоритмы зерна и тона |

*Подробный реестр зафиксирован в [assets/LICENSES.md](assets/LICENSES.md).*

---

### 3. Полный список созданных и обновлённых файлов проекта

- `package.json` — зависимости и скрипты проекта
- `package-lock.json` — детерминированный лок-файл зависимостей
- `app.json` — конфигурация Expo (package: `com.eai.retrocamera`, разрешения камеры и микрофона)
- `tsconfig.json` — строгая конфигурация TypeScript
- `jest.config.js` — конфигурация модульного тестирования Jest
- `babel.config.js` — настройка babel с worklets плагином
- `assets/LICENSES.md` — реестр лицензий и источников
- `assets/luts/README.md`, `assets/textures/README.md`, `assets/sounds/README.md` — зарезервированные каталоги
- `src/cameras/types.ts` — типизация профилей камер и конфигурации фильтров
- `src/cameras/warmFilm.ts` — декларативный профиль камеры «Тёплая плёнка»
- `src/cameras/index.ts` — точка экспорта профилей камер
- `src/engine/types.ts` — типы параметров движка и униформ
- `src/engine/RetroSkiaShader.ts` — SkSL шейдер превью (тёплый баланс + анимированное зерно)
- `src/engine/RetroCameraPreview.tsx` — компонент живого видоискателя камеры с GPU-оверлеем
- `src/recorder/types.ts` — состояния машины сессии и типы кусков
- `src/recorder/SessionManager.ts` — изолированная машина состояний (запись, пауза, остановка, склейка, защита от дублей, верификация файлов)
- `src/recorder/useRecorderSession.ts` — React-хук управления сессией записи
- `src/recorder/__tests__/SessionManager.test.ts` — модульные тесты для SessionManager
- `src/ui/ChunkFilmstrip.tsx` — горизонтальная плёночная лента кусков с перфорацией
- `src/ui/RetroCameraScreen.tsx` — главный экран приложения с ретро-интерфейсом и кнопками
- `src/features/README.md` — резерв для независимых модулей будущих этапов
- `modules/retro-export/expo-module.config.json` — манифест локального нативного модуля Expo
- `modules/retro-export/index.ts` — кроссплатформенный TypeScript-мост модуля экспорта
- `modules/retro-export/android/build.gradle` — Gradle-скрипт сборки нативного модуля с AndroidX Media3
- `modules/retro-export/android/src/main/AndroidManifest.xml` — манифест модуля
- `modules/retro-export/android/src/main/java/expo/modules/retroexport/RetroExportModule.kt` — нативный модуль Expo на Kotlin
- `modules/retro-export/android/src/main/java/expo/modules/retroexport/WarmFilmGlEffect.kt` — обёртка GlEffect для Media3
- `modules/retro-export/android/src/main/java/expo/modules/retroexport/WarmFilmShaderProgram.kt` — OpenGL ES 2.0 шейдер обработки кадров
- `App.tsx` — корневой компонент приложения
- `index.ts` — точка входа Expo
- `README.md` — документация проекта с пошаговыми инструкциями
- `REPORT.md` — этот отчёт
- `HANDOFF.md` — журнал работ и статус проекта

---

### 4. Результаты проверок

1. **Модульные тесты (`npm test`):**
   - 11 тестов `SessionManager.test.ts` проверяют: переход состояний, быстрые параллельные клики, финализацию файлов при паузе, игнорирование пустых/битых кусков, сохранение ленты при ошибке экспорта, целостность списка кусков и восстановление каталога.
2. **Локальная компиляция Android на ПК:**
   - На компьютере владельца установлена Java 1.8 (build 1.8.0_231), Android Studio и Android SDK отсутствуют. Согласно HANDOFF §1.1 и §4, сборка APK локально не требуется — сборка делегирована автономному раннеру GitHub Actions (Ubuntu-latest с предустановленным JDK 17 и Android SDK 35).
3. **Тестирование на реальном телефоне:**
   - Статус: **ожидается сборка APK**. После сборки APK через GitHub Actions владелец выполнит сценарий «Раз, два, три» (хлопки и проверка склеенного ролика в Галерее).

---

### 5. Инструкции для Codex (§11 пункт 3)

1. Проверить репозиторий и созданный локальный код.
2. Добавить рабочий процесс GitHub Actions `.github/workflows/android.yml`:
   - Runner: `ubuntu-latest`.
   - Настройка окружения: `actions/setup-node@v4` (Node 20 или 22), `actions/setup-java@v4` (Java 17, distribution: 'temurin').
   - Установка: `npm ci`.
   - Генерация нативного проекта: `npx expo prebuild --clean --platform android`.
   - Сборка Release APK: `cd android && ./gradlew assembleRelease` (с дефолтной отладочной подписью).
   - Путь артефакта APK: `android/app/build/outputs/apk/release/app-release.apk`.
   - Публикация APK в GitHub Releases с тегом (например, `v0.1.0-alpha`).
3. Выполнить push в `main` через соавтора `tenyls`.
4. Запустить workflow и передать владельцу ссылку на скачивание APK из Releases.

---

### 6. Внимание следующему помощнику
> **Внимание следующему помощнику (Codex / Claude):** Не объявлять Этап 0 окончательно закрытым до тех пор, пока владелец физически не подтвердит на Android-телефоне воспроизведение готового ролика из системной Галереи (наличие видимого зерна, тёплого оттенка и отсутствие рассинхрона хлопков со звуком).
