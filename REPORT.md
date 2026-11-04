# Поставка 0.2.0 / проверенный APK — 04.11.2026, Codex (GPT-6)

**[Скачать обновление APK](https://github.com/eai-apps/YAi-Retro-Camera/releases/download/v0.2.0-test-29/YAi-Retro-Camera-0.2.0.apk)** · [Release](https://github.com/eai-apps/YAi-Retro-Camera/releases/tag/v0.2.0-test-29) · [успешный CI](https://github.com/eai-apps/YAi-Retro-Camera/actions/runs/41918642264).

- Код APK: 81e2d21dad9ffa94e2621d2407c039df225e4ff7. Версия 0.2.0, code 29, package com.eai.retrocamera, Android 10+ (min29/target34/compile35), ARM64/ARMv7/x86_64. Размер 106612338 байт. SHA-256: 90c8982e5b028f1b5379ef99ff7db57011e1bf01a345dfb9b4ad402a72e3ec84. Скачать из Release и сверить GitHub digest/SHA256SUMS; локальный хеш совпал с CI. AndroidManifest прочитан из фактического APK.
- Подпись: apksigner в CI — Verifies, v2=true. Сертификат fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c, тот же, что в stage-0-3. Локальная повторная криптографическая проверка подписи не выполнялась; целостность скачанного файла проверена SHA. Production keystore не использовался.
- Чистые npm ci, TypeScript, 39 JS-тестов, общая генерация/компиляция SkSL, Hermes bundle, Expo prebuild/native registration и assembleRelease прошли. Пять native tests на каждом API29/35: четыре формата фото + реальная MediaStore-галерея/удаление; защита чужих файлов/каталога; нулевой PCM без придуманного треска; склейка трёх MP4 в 720×1280 с настоящей AAC/изменением цвета/длительностью; отдельный 1080×1920 Full HD с аудио. Full HD тест использует синтетический исходник: он доказывает размер/аудио экспорта, а не детализацию физической камеры.
- Экранные тесты устанавливают автономный APK на API29/35, дожидаются настоящей готовности камеры, снимают фото, сохраняют обработанный JPEG, удаляют его в «Моих работах», открывают настройки и меняют тему; на API29/35 дополнительно снимают два немых видеокуска, удаляют один и склеивают оставшийся. Первый запрос микрофона проверен настоящим системным диалогом до переключения теста в mute. UI snapshot берётся публичным UiAutomation через отдельный androidTest helper без ожидания остановки живого таймера; helper не включён в release APK. Кнопки нажимаются через adb, обработка и запись настоящие. Сохранены XML/PNG/logcat в артефактах CI; снимки проверены Codex. Эмуляторы не подтверждают реальные сенсор/микрофон/4K Mi 8.
- В APK CAMERA/RECORD_AUDIO; READ/WRITE_EXTERNAL_STORAGE отсутствуют. Широких READ_MEDIA, SYSTEM_ALERT_WINDOW, VIBRATE нет. Своя adaptive/launcher-иконка. Фото декодируются с ограничением памяти и длинной стороны 4096; JPEG96. Full HD по умолчанию; недоступное качество сообщается, скрытый encoder fallback отключён, готовые размеры/аудиодорожка проверяются перед публикацией файла в галерее.
- Новая версия: фото/видео, шесть камер и сила, удаление/порядок/очистка, сохранённая галерея с фильтрами и удалением старых роликов, импорт, полароид/фотобудка/коллаж, дата/REC, три режима звука, две темы и настройки. Воспроизводимые MIT-поправки VisionCamera и useCameraHardware дают актуальный снимок камер после позднего init; убрана лишняя видеоповерхность в фото, обработан пустой список форматов и готовность привязана к активной конфигурации без remount на каждое качество. По прямому решению владельца minSDK29 / Android 10+: legacy storage и обходы старых ОС удалены, native/UI-матрица API29/35. Ранние API26/28 тесты ниже сохранены только как история. На ограниченных камерах видео автоматически использует явно подписанное оригинальное превью и эффект при сохранении, без снижения качества записи.
- Прежние G:-файлы сохранены в work/local-before-stage1; затем исходники перенесены в рабочую и TempCode с побайтовой проверкой и синхронизацией карты доступов. Секреты/ключи, зависимости и генерируемый android не копировались. История и stage-0-3 сохранены.

**Ещё не проверено физически:** новые функции на Xiaomi Mi 8 / Android 10, слышимость голоса, синхронность хлопков, детализация реального Full HD/4K, длительная запись и нагрев. Ранее владелец подтвердил только запись/склейку stage-0-3; тихий ТВ/небольшой треск без речи не являются тестом микрофона. Установить обновлением без удаления, пройти инструкцию README.

| Требование MVP | Реализация | Проверено |
|---|---|---|
| Шесть камер, сила, многослойный эффект | src/cameras, общий GLSL/SkSL, PhotoEngine/FxConfig | JS-профили, компиляция SkSL, native GPU-изменение цвета; все шесть на реальном сенсоре ещё не проверены |
| Фото, полароид, фотобудка, коллаж | Фото-съёмка, выбор исходников, четыре native layout | Native JPEG/MediaStore для всех четырёх layout; экранная съёмка/сохранение фото API29/35; отсчёт фотобудки и выбор нескольких фото — ручная проверка |
| Импорт фото/видео | Системный Expo ImagePicker → private copy с проверкой метаданных | Native импорт синтетического видео и контроль пути; UI системного выбора на Mi 8 ещё не проверен |
| Куски: удаление, порядок, очистка, восстановление | ChunkFilmstrip/SessionManager, AtomicFile до удаления | JS-тесты порядка/удаления/каталога; APK API29/35 записывает два куска, удаляет один и сохраняет оставшийся; восстановление старого черновика на Mi 8 ещё не проверено |
| Удаление сохранённых фото/видео | MediaStore, своя папка/префикс, фильтры «Моих работ» | Native создание/удаление фото и видео API29/35, защита чужих URI; APK удаляет фото; удаление прежних stage-0-3 на телефоне ещё не проверено |
| Качество 720p / Full HD / 4K | Форматы камеры, H264 8/18/40 Мбит/с, без encoder fallback | Синтетический экспорт 720×1280 и 1080×1920; камера эмулятора записывает доступное 720p; реальные Full HD/4K зависят от камеры и кодека Mi 8 |
| Дата/REC, звук | StampOverlay, AAC, live/vintage/mute, AudioTools | Native GPU overlay + реальная AAC/RMS и отсутствие шума на нулевом PCM; первый системный запрос микрофона и готовность live-видео, затем экранный mute; реальный голос и хлопки ещё не проверены |
| Темы, настройки, иконка, Android 10+ | SettingsPanel/SharedPrefs, собственные launcher/adaptive assets | JS-настройки, APK открывает настройки/меняет тему API29/35; min29 в фактическом manifest; тестовая подпись совместима со stage-0-3 |

История разработки и прежних проверок:

---
# Этап 1 / 0.2.0 — подготовка к Android CI, 02.11.2026

Основание: замечания владельца после stage-0-3 и исходный MVP HANDOFF §7. Устройство: Xiaomi Mi 8 / Android 10. Владелец подтвердил только запись/склейку прототипа. Небольшой треск и неслышный тихий ТВ без записи голоса не доказывают исправность или неисправность микрофона.

| Требование | Реализация | Доказательство на момент отправки |
|---|---|---|
| Шесть камер, сила, многослойные эффекты | src/cameras, resolveEffect, общий GLSL/SkSL, FxConfig для фото | 3 теста профилей, компиляция SkSL; Android GPU ожидается |
| Фото, полароид/фотобудка/коллаж, импорт | PhotoEngine, RetroCameraScreen, системный ImagePicker | Native instrumentation подготовлен; CI ожидается |
| Удаление/порядок/очистка исходников | SessionManager.editChunks, ChunkFilmstrip, MediaFiles | 5 новых тестов, каталог сохраняется до удаления файлов |
| Удаление сохранённых работ | MediaStore, только папка/префикс YAi Retro | Native tests подготовлены, старые stage-0-3 имена совместимы |
| Full HD/4K, дата/REC, живой звук | VisionCamera format/bitrate; Media3 H264/AAC, overlays; AudioTools | Показ фактического формата, без скрытого encoder fallback; CI ожидается |
| Настройки, темы, иконка | SettingsPanel/useAppSettings, собственный CanvasKit-рисунок | 2 теста настроек; иконка просмотрена локально |
| Android 9+ | minSDK 28 приложения, legacy storage API28, MediaStore API29+ | уточнено после APK12: живое Skia-превью требует Image.getHardwareBuffer API28; чистые медиа-компоненты проверены также на API26 |

Локально: TypeScript и 39 тестов в 7 наборах прошли, общий SkSL скомпилирован CanvasKit. Полная Android-компиляция и тесты ещё НЕ пройдены. Release workflow блокирует публикацию до native media и запуска APK. Отдельные проверки звука: RMS/peak исходника, синтетическая AAC после склейки, отсутствие придуманного треска в нулевом PCM. Реальный микрофон, качество/скорость/нагрев Mi 8 требуют телефона.

История прежней поставки сохранена ниже.

---
# Итог проверки и сборки — 2026-11-02 00:27 (Europe/Berlin), Codex (GPT-6)

**Тестовый APK собран и опубликован. Проверка на настоящем телефоне ещё не выполнена; Этап 0 не закрыт.**

- Код APK: commit `27c2cdd41fb71d937e50993b983e6c60feb333d2` в `eai-apps/YAi-Retro-Camera/main`. Последующие изменения этой поставки — только HANDOFF/README/REPORT.
- [Успешный GitHub Actions run 41360948360](https://github.com/eai-apps/YAi-Retro-Camera/actions/runs/41360948360): чистая npm ci, TypeScript, 29 тестов в 4 наборах, генерация/компиляция SkSL, standalone Hermes bundle, Expo prebuild, native registration, Gradle assembleRelease. Gradle: BUILD SUCCESSFUL in 9m 12s.
- [Тестовый релиз stage-0-3](https://github.com/eai-apps/YAi-Retro-Camera/releases/tag/stage-0-3), prerelease. [Скачать APK](https://github.com/eai-apps/YAi-Retro-Camera/releases/download/stage-0-3/YAi-Retro-Camera-stage-0.apk).
- Размер: 103970388 байт (около 104 МБ). SHA-256: `5e76136bc824355189d702df9cbaf071d1951526283fcb0e0c194a875defad88`.
- APK скачан из релиза; локальный SHA-256 совпал и с SHA256SUMS.txt, и с digest GitHub Release. Проверены наличие assets/index.android.bundle, classes.dex и нативных библиотек. Проверяемая поддержка — ARM64/ARMv7; наличие отдельных x86/x86_64 библиотек из зависимостей не означает полной поддержки этих ABI.
- Манифест прочитан из фактического APK: package `com.eai.retrocamera`, versionName `0.1.0`, versionCode `3`, minSdk `29` (Android 10+), targetSdk `34`, compileSdk `35`. Широкие разрешения галереи, SYSTEM_ALERT_WINDOW и VIBRATE отсутствуют.
- Подпись проверена **в CI** через apksigner: Verifies, APK Signature Scheme v2=true. Сертификат Android Debug; SHA-256 сертификата `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`. Production keystore не использовался. Локально отдельно проверена целостность скачанных байтов, повторная локальная apksigner-проверка не запускалась.
- Локальная независимая упаковка JS тоже успешна: 1049 модулей, HBC 2,96 МБ. Первая попытка остановилась на правах временной папки sandbox; повтор с TEMP/TMP в work завершился с exit 0.
- Проверенные исходники синхронизированы в обе папки на G: (рабочая и TempCode), перед записью проверено отсутствие чужих изменений. Прежние файлы сохранены в `work/local-before-review` каталога этой проверки; исходный снимок Antigravity — `work/audit-input`. node_modules, генерируемый android/ и ключи не переносились. Карты доступов в обоих HANDOFF синхронизированы.

## Что остаётся проверить на устройстве

Реальная камера/микрофон, устойчивость Skia-превью, три отдельных куска → единый ролик из галереи с тёплым цветом и движущимся зерном, совпадение хлопков/звука у начала/стыков/конца, уход в фон и восстановление ленты после перезапуска. Ни физический телефон, ни эмулятор в этой проверке не использовались. Рассинхрон и производительность на устройстве не измерялись. Сценарий установки и проверки — README.md.

Статический анализ, unit-тесты, успешная Android-сборка, подпись и checksum **не подтверждают** автоматически успешную съёмку/экспорт на конкретном телефоне. Новых серверов, платных услуг, аккаунтов и production-ключей не создавали; чужие проекты не менялись.

Предыдущие записи ниже сохранены как история работы. Указанные в них ожидания CI и заявления Antigravity о полной готовности относятся к тем моментам, а не к результату испытания на устройстве.

---

## Автономный bundle подтверждён — 02.11.2026

Локальный expo export --platform android завершён успешно: 1049 модулей, Hermes HBC 2,96 МБ. В первой локальной попытке hermesc не получил права записи во временную папку sandbox; повтор с TEMP/TMP внутри рабочего каталога завершился с exit 0, без изменения приложения. На GitHub запуск 41360948360 также прошёл standalone bundle и приступил к assembleRelease. Это подтверждает упаковку JS, но ещё не успешный APK и не работу камеры на устройстве.

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
