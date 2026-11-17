# Архитектура закрытых моделей Google — доказательные оценки (конец октября 2026)

## Вопрос

Оценить архитектуру шести закрытых моделей Google по состоянию на конец октября 2026: **Gemini 3.5 Flash-Lite**, **Gemini 3.8 Flash**, **Gemini 4 Argon**, **Gemini 4 Carbon**, **Gemini 3.5 Transcribe** (и вариант Live) и **Nano Banana 2.1** (`gemini-nano-banana-2.1`). Google не публикует число параметров, поэтому цель — наилучшие обоснованные оценки с явной маркировкой каждого числа: **подтверждено**, **достоверный отчёт** или **мой вывод**.

---

## Краткое резюме

1. **Вся линейка — разреженные MoE (sparse mixture-of-experts); это официально подтверждено** карточками моделей Gemini 3 Pro и Gemini 4 Argon ([карточка Gemini 3 Pro](https://storage.googleapis.com/deepmind-media/Model-Cards/Gemini-3-Pro-Model-Card.pdf), [обзор карточки Gemini 4](https://thezvi.wordpress.com/2026/10/26/gemini-4-argon-the-model-and-safety-cards/)). Число экспертов, слоёв и параметров Google никогда не раскрывал.
2. **Gemini 4 Argon — около 4,5 трлн параметров (диапазон 2,5–8 трлн), ~300 млрд активных (120–500 млрд)**. Опорные улики: отраслевые проверки ~5–6 трлн и 400–500 млрд активных ([fundaai](https://fundaai.substack.com/p/researchllm-gemini-4-brings-google)), калибровка по цене ($4/$20) и скорости (~83 ток/с) против открытых моделей 2026 года и слухов о GPT-6 Astra (4,2–4,8 трлн).
3. **Carbon — почти наверняка та же база, что Argon, с дополнительным пост-трейнингом, а не большая модель**: идентичная цена и контекст, сопоставимая скорость вывода (~100 против ~83 ток/с), вдвое больший TTFT и вдвое больше токенов размышления на задачу, интервал между релизами всего 15 дней.
4. **Вся Flash-линейка 2026 года — одна база**: 3.8 Flash «основан на 3.7 Flash», 3.6 — на 3.5, 3.5 — на Gemini 3 Flash; 3.5 Flash-Lite «основан на 3.1 Flash-Lite». Это итеративные пост-трейнинг-обновления одной предобученной базы, а не новые архитектуры.
5. **Transcribe построен на Gemini 3 Pro, а не на Flash** — неожиданный факт из карточки модели (семейство «Gemini 3.5 Audio», обе версии — на основе Gemini 3 Pro, контекст 96К). Аудио-энкодер — наследник USM/Chirp (Conformer, ~2 млрд параметров у USM).
6. **Nano Banana 2.1 = Gemini 3.6 Flash + генерация изображений авторегрессионными токенами**: изображение 1K занимает 1290 выходных токенов (это не диффузия), плюс отдельный декодер токенов в пиксели (оценочно 0,5–2 млрд параметров).
7. **Слои и петли (recurrent depth)**: официальных данных нет ни по одной модели. Единственный конкретный намёк — отраслевые проверки Gemini 4 с «тремя петлями» (looped architecture); для остальных моделей улик в пользу петель нет.
8. **Калибровочная сетка**: оценки AA Intelligence Index v5.0 — Flash-Lite 12, 3.8 Flash 31, Argon 50, Carbon 59; цены $0,30/$2,50 → $0,75/$3,75 → $4/$20 выстраивают модели в ясную иерархию активных параметров примерно 20 млрд → 50 млрд → 300 млрд.

---

## Методология

**Углы поиска**: (1) официальные материалы Google/DeepMind — блоги, карточки моделей, документация API, техноотчёт Gemini 2.5; (2) независимые измерители — Artificial Analysis, BenchLM, OpenRouter; (3) отраслевые оценки — Substack/X/СМИ (fundaai, @scaling01, Ed Zitron, ExpertBeacon), с пометкой надёжности; (4) открытая линейка Gemma 4 как архитектурная родословная (как gpt-oss для OpenAI); (5) экономика сервинга — цены, скорости, TPU Ironwood; (6) сравнение с открытыми моделями 2026 года известного размера (Kimi K3 2,8T-A104B, Qwen3.8 Max 2,4T-A95B, DeepSeek V4 Pro 1,65T-A49B, Mistral Large 4 ~1T-A52B, GLM-5.3 753B, gpt-oss-120b 117B-A5.1B).

**Ограничения**: Google не публикует параметры, слои и конфигурацию экспертов; техноотчёта уровня arXiv для Gemini 3/4 нет (только карточки). Все оценки размеров — триангуляция, а не измерение. Индекс AA v5.0 (запущен 27 октября 2026) несопоставим с более ранними версиями v4.x — сравнение моделей по разным версиям индекса некорректно. Третичные агрегаторы (dev.to, atoms.dev,百度-статьи) использованы только как зафиксированные слухи с оценкой достоверности 1–2/5.

---

## Сводная таблица оценок

| Модель | Всего параметров (центр; диапазон) | Активных на токен | Слои (петли) | Эксперты (всего / активных / общих) | Вне основных слоёв | Уверенность | Ключевые улики |
|---|---|---|---|---|---|---|---|
| **Gemini 4 Argon** | ≈4,5 трлн (2,5–8) | ≈300 млрд (120–500) | ~120 уникальных (100–160); возможно 2–3 петли на части стека — недоказано | Не раскрыты; вывод: тонкозернистые, 128–512 всего, 8–16 активных, 1–2 общих, плотные первые/последние слои | ViT-видеоэнкодер ~0,5–2 млрд; аудио-энкодер USM-типа ~1–3 млрд; эмбеддинги (словарь 262К) ~5–10 млрд | **низкая–средняя** | Карточка: sparse MoE, 1M контекст ([Zvi](https://thezvi.wordpress.com/2026/10/26/gemini-4-argon-the-model-and-safety-cards/)); отраслевые проверки: 5–6 трлн / 400–500 млрд / 3 петли ([fundaai](https://fundaai.substack.com/p/researchllm-gemini-4-brings-google)); цена $4/$20 и 83 ток/с ([BenchLM](https://benchlm.ai/models/gemini-4-argon)) |
| **Gemini 4 Carbon** | ≈4,5 трлн (2,5–8) — та же база, что Argon | ≈300 млрд (120–500) | как у Argon | как у Argon | как у Argon | **для общей базы — средняя; для чисел — низкая** | «Building on Argon» ([блог Google](https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-carbon/)); та же цена/контекст; ~100 ток/с против 83 у Argon; TTFT 97–104 с против 45–48 с ([AA](https://artificialanalysis.ai/models/comparisons/gemini-4-carbon-vs-gemini-4-argon)) |
| **Gemini 3.8 Flash** | ≈800 млрд (400–1500) | ≈50 млрд (25–90) | ~70–90 уникальных (вывод); улик о петлях нет | не раскрыты; вывод: та же философия, меньше экспертов/размеров | энкодеры как у флагмана, но меньше: ~0,3–2 млрд; эмбеддинги ~3–6 млрд | **низкая–средняя** | Карточка: «основан на 3.7 Flash», не новая архитектура ([AI/TLDR](https://ai-tldr.dev/models/gemini-3-8-flash/)); $0,75/$3,75, ~128 ток/с, AA v5 = 31 ([AA](https://artificialanalysis.ai/models/gemini-3-8-flash)) |
| **Gemini 3.5 Flash-Lite** | ≈150 млрд (60–400) | ≈20 млрд (8–40) | ~40–60 уникальных (вывод); петель нет | не раскрыты | мини-энкодеры ~0,3–1,5 млрд; эмбеддинги ~2–5 млрд | **низкая** | Карточка: «основан на 3.1 Flash-Lite» ([DeepMind](https://deepmind.google/models/model-cards/gemini-3-5-flash-lite/)); $0,30/$2,50, ~490 ток/с, AA v5 = 12 ([OrcaRouter](https://www.orcarouter.ai/blog/gemini-3-5-flash-lite), [Apiyi](https://help.apiyi.com/en/gemini-api-argon-flash-flash-lite-selection-guide-en.html)) |
| **Gemini 3.5 Transcribe (+ Live)** | ≈2,5 трлн (1–5) — база Gemini 3 Pro | ≈100 млрд (30–200) | слои Gemini 3 Pro (не раскрыты); петель нет | конфигурация Gemini 3 Pro (не раскрыта) | аудио-энкодер Conformer/USM-линейки ~1–3 млрд (USM: 2 млрд, 32 блока); видеовхода нет | **база — подтверждена; размеры — низкая** | Карточка: семейство «Gemini 3.5 Audio», обе версии «основаны на Gemini 3 Pro», контекст 96К, выход 32К ([AI Wiki с цитатами карточки](https://aiwiki.ai/wiki/gemini_3_5_transcribe)); USM 2 млрд ([InfoQ](https://www.infoq.com/news/2023/05/universal-speech-model/)) |
| **Nano Banana 2.1** | ≈700 млрд (400–1200) — база Gemini 3.6 Flash | ≈45 млрд (25–80) | слои Flash-базы (~70–90, вывод) | конфигурация 3.6 Flash (не раскрыта) | видеоэнкодер ~0,3–2 млрд; image-декодер токены→пиксели ~0,5–2 млрд (вывод); эмбеддинги | **база и механизм — подтверждены; размеры — низкая** | Карточка: «основан на Gemini 3.6 Flash», вывод: изображение+текст ([DeepMind](https://deepmind.google/models/model-cards/nano-banana-2-1/)); 1290 токенов на 1K-изображение, $30/M ([цены API](https://ai.google.dev/gemini-api/docs/pricing)); AR, не диффузия ([fal.ai](https://fal.ai/learn/tools/how-to-use-nano-banana-2)) |

Числа в таблице — центральные оценки с диапазонами; обоснование каждой строки ниже. Категория уверенности относится к оценкам параметров, а не к официальным фактам (цены, контексты, даты — подтверждены).

---

## Контексты, модальности и даты отсечения знаний

| Модель | Контекст (вход/выход) | Вход | Выход | Отсечение знаний |
|---|---|---|---|---|
| Gemini 4 Argon | 1 048 576 общий; 65 536 синхронный выход, до 1M с long decode ([BenchLM](https://benchlm.ai/models/gemini-4-argon), [Codersera](https://codersera.com/blog/gemini-4-argon-complete-guide-2026/)) | текст, изображение, видео, речь ([AA](https://artificialanalysis.ai/articles/gemini-4-argon-google-top-three-labs)) | текст | март 2026 ([Zvi](https://thezvi.wordpress.com/2026/10/26/gemini-4-argon-the-model-and-safety-cards/)) |
| Gemini 4 Carbon | 1M, как у Argon ([AA](https://artificialanalysis.ai/articles/gemini-4-carbon-new-number-1)) | текст, изображение, видео, речь | текст | март 2026 (наследует структуру безопасности Argon; явно не опубликовано — вывод) |
| Gemini 3.8 Flash | 1M вход / 64K выход ([BenchLM](https://benchlm.ai/models/gemini-3-8-flash)) | текст, изображение, видео, аудио, PDF; двунаправленный live-поток А/В ([Naren Vadapalli](https://www.narenvadapalli.com/blog/google-gemini-3-8-flash-multimodal-speed-efficiency/)) | текст | вероятно март 2026 (явно не подтверждено) |
| Gemini 3.5 Flash-Lite | 1M / 64K ([OrcaRouter](https://www.orcarouter.ai/blog/gemini-3-5-flash-lite)) | текст, изображение, аудио, видео, PDF | текст | март 2026 ([VentureBeat](https://venturebeat.com/technology/googles-gemini-3-6-flash-model-cuts-ai-agent-token-costs-by-up-65-on-long-horizon-engineering-tasks-and-3-5-pro-is-on-the-way)) |
| Gemini 3.5 Transcribe / Live | 96K вход (аудио+текст) / 32K выход ([AI Wiki, карточка](https://aiwiki.ai/wiki/gemini_3_5_transcribe)); live-сессии ≤10 мин, записи ≤60 мин (30 мин с диаризацией) ([блог Google](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-5-transcribe/)) | аудио, текст | текст | январь 2025 (карточка) |
| Nano Banana 2.1 | API: вход 131 072 / выход 32 768 ([документация](https://ai.google.dev/gemini-api/docs/models/gemini-nano-banana-2.1)); карточка говорит «до 1M» — противоречие | текст, изображение, видео, PDF | изображение (1290 токенов на 1K; 1680 на 2K; 2520 на 4K) + текст | март 2026 (наследует Gemini 3.6 Flash) |

---

## Детальные находки

### 1. Gemini 4 Argon — новый флагман (анонсирован 30 сентября, API 13 октября 2026)

**Подтверждено.** Карточка модели (14 страниц) описывает **разреженный MoE**, контекст 1M, мультимодальный вход, отсечение знаний март 2026, обучение на TPU через JAX и ML Pathways; в отчёте по безопасности есть раздел о дистилляции ([обзор карточки Zvi](https://thezvi.wordpress.com/2026/10/26/gemini-4-argon-the-model-and-safety-cards/), [MarkTechPost](https://www.marktechpost.com/2026/10/13/google-gemini-4-argon-api-release/)). Цены: вводные $2/$10 до 30 ноября, с 1 декабря $4/$20; кэш 95% скидка; Batch/Flex −50%; Priority $7,20/$36 ([блог Google](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-4-argon/), [BenchLM](https://benchlm.ai/models/gemini-4-argon)). Скорость: ~82–83 ток/с, TTFT 45–48 с (высокое reasoning) ([BenchLM](https://benchlm.ai/models/gemini-4-argon), [AA](https://artificialanalysis.ai/models/comparisons/gemini-4-carbon-vs-gemini-4-argon)). AA Intelligence Index: 53 на v4.x при запуске, 50 на v5.0; AA-Omniscience: точность 50%, галлюцинации 15% — минимум среди лидеров ([AA](https://artificialanalysis.ai/articles/gemini-4-argon-google-top-three-labs), [Apiyi](https://help.apiyi.com/en/gemini-api-argon-flash-flash-lite-selection-guide-en.html)).

**Достоверный отчёт.** Отраслевые проверки (industry checks) неизвестного, но цитируемого аналитического бюллетеня: **~5–6 трлн всего, 400–500 млрд активных на токен, looped-архитектура с ~3 петлями** ([fundaai](https://fundaai.substack.com/p/researchllm-gemini-4-brings-google)). Против этого блог на dev.to утверждает «до 1,6 трлн» ([dev.to](https://dev.to/naveenmalothu/getting-hands-on-with-gemini-4-argon-what-it-is-why-it-matters-and-how-to-plug-it-into-your-stack-2h9h)) — оценка достоверности 1/5, игнорирую как фантазию агрегатора. Пичай в июле 2026 называл Gemini 4 «самым амбициозным прогоном предобучения» и «существенно большей» моделью ([ITBear](https://www.itbear.com.cn/html/2026-07/1466725.html)).

**Мой вывод (оценки).**
- *Всего параметров: ≈4,5 трлн (2,5–8).* Триангуляция: (а) fundaai: 5–6 трлн; (б) паритет интеллекта с GPT-6 Astra (оба ~50–53 на AA), для которого циркулируют оценки 4,2 трлн / 120 млрд активных у @scaling01 ([OrcaRouter](https://www.orcarouter.ai/blog/openai-astra-gpt-6-leak)) и 4,8 трлн у Эда Зитрона ([X](https://x.com/edzitron/status/2096961600825462850)); (в) Argon стоит 60% от Astra за задачу при равном интеллекте ([AA](https://artificialanalysis.ai/articles/gemini-4-argon-google-top-three-labs)) — на собственных TPU Google может себе позволить больше параметров за доллар. Открытые модели 2026 года (Kimi K3 2,8T-A104B, Qwen3.8 Max 2,4T-A95B) набирают 40–46 на v5; для 50 нужно больше ёмкости.
- *Активные параметры: ≈300 млрд (120–500).* Скорость вывода 83 ток/с на Ironwood примерно в 6 раз ниже Flash-Lite (~490) и в 1,5 раза ниже 3.8 Flash (~128) — при связанном памятью декоде это указывает на активные параметры в сотни миллиардов; fundaai даёт 400–500 млрд. Цена $4/$20 в 5,3 раза выше 3.8 Flash согласуется с ~5-кратной разницей активных параметров.
- *Слои: ~120 уникальных (100–160).* Прямых данных нет. Экстраполяция: Gemma 4 26B — 30 слоёв на ~4 млрд активных ([HF-конфиг](https://hf-mirror.com/google/gemma-4-31B-it)); флагманы 2026-го на порядок больше; слух о GPT-6 Astra — ~112 слоёв ([OrcaRouter](https://www.orcarouter.ai/blog/openai-astra-gpt-6-leak)). Центральная оценка ~120.
- *Петли (recurrent depth): возможно 2–3 прохода на части стека — недоказано.* Единственная улика — fundaai («three loops»); The Information описывает looped-архитектуру как индустриальный тренд и проблему безопасности ([OrcaRouter](https://www.orcarouter.ai/blog/openai-astra-gpt-6-leak)). Если петли есть, эффективная глубина ~200–360 проходов при ~120 уникальных слоях. Уверенность низкая: Google об этом не заявлял.
- *MoE-конфигурация: 128–512 экспертов, 8–16 активных, 1–2 общих.* Вывод из родословной: Gemma 4 A4B имеет **128 экспертов, 8 активных, 1 общий** ([конфиг на HF](https://hf-mirror.com/google/gemma-4-31B-it)) — философия тонкозернистых экспертов с общим экспертом почти наверняка перенесена на Gemini 4. Отношение всего/активных у флагманов 2026 года (K3: 27:1, Qwen Max: 25:1) при моих оценках даёт 15–27:1 — согласуется.
- *Вне слоёв:* видео/изображения через ViT-энкодер (исторически ~258–263 токенов/кадр; видео ≈263 ток/с — [TokenCalc](https://www.tokencalc.org/video-audio-token-calculator)); аудио ≈32 ток/с через USM-подобный энкодер; вместе ~1–3 млрд параметров (наследие USM: 2 млрд, 32 Conformer-блока — [InfoQ](https://www.infoq.com/news/2023/05/universal-speech-model/)). Эмбеддинги: словарь 262К (род Gemma) при скрытом размере ~15–20К даёт ~4–5 млрд на таблицу.

### 2. Gemini 4 Carbon (анонсирован 28 октября 2026)

**Подтверждено.** «Building on Gemini 4 Argon»; тот же многослойный стек безопасности; та же вводная цена $2/$10 и стандартная $4/$20; 1M контекст; вход текст/изображение/видео/речь, выход текст; #1 на AA Intelligence Index v5.0 (59); SEC-bench Pro 88,2%, ExploitGym 54,8%, CWE-bench 71,0% ([блог Google](https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-carbon/), [AA](https://artificialanalysis.ai/articles/gemini-4-carbon-new-number-1)).

**Мой вывод: та же база, что Argon, с усиленным пост-трейнингом (уверенность средняя, по числам — низкая).**
- Скорость вывода **~100 ток/с — не ниже, а чуть выше Argon** (82–83) — большая модель на том же железе декодировала бы медленнее ([AA-сравнение](https://artificialanalysis.ai/models/comparisons/gemini-4-carbon-vs-gemini-4-argon), [OrcaRouter](https://www.orcarouter.ai/blog/gemini-4-carbon-vs-gemini-4-argon)). Это самая сильная улика против «Carbon = большая модель».
- TTFT **удвоился** (97–104 с против 45–48 с), токенов на задачу вдвое больше (123К против 62К) — Carbon просто «думает» дольше; +9 пунктов индекса при той же цене за токен куплены длиной размышлений и пост-трейнингом ([AA](https://artificialanalysis.ai/articles/gemini-4-carbon-new-number-1), [Beri.net](https://www.beri.net/article/gemini-4-carbon-launch-fairwind-cyber-defenders-only-pricing-2-10-then-4-20-artificial-analysis-59-sec-bench-vs-argon)).
- 15 дней между анонсами — недостаточно даже для серьёзного пост-трейнинга новой базы, тем более нового предобучения. Ars Technica оценила Carbon как «slightly better version of Argon», возможно пост-трейнинг-обновление ([OrcaRouter](https://www.orcarouter.ai/blog/gemini-4-carbon-vs-gemini-4-argon)).
- **Оценки размеров: идентичны Argon** (≈4,5 трлн всего; ≈300 млрд активных; те же энкодеры). Альтернативная гипотеза — больший чекпоинт из того же семейства прогонов — не исключена, но ни цена, ни скорость её не поддерживают.

### 3. Gemini 3.8 Flash (2 сентября 2026, вместе с 3.8 Flash Cyber)

**Подтверждено.** Карточка модели прямо говорит: 3.8 Flash — «следующая итерация семейства Gemini 3, **основанная на Gemini 3.7 Flash**», архитектура унаследована оттуда же ([AI/TLDR](https://ai-tldr.dev/models/gemini-3-8-flash/), [Local AI Zone](https://local-ai-zone.github.io/blog/Gemini_3.8_Flash_Technical_Breakdown.html)). Цепочка базы: Gemini 3 Flash → 3.5 Flash ([Appwrite](https://appwrite.io/blog/post/gemini-3-5-flash-deep-dive)) → 3.6 Flash «основан на 3.5 Flash» ([CometAPI](https://www.cometapi.com/what-is-gemini-3-6-flash/)) → 3.7 Flash → 3.8 Flash. Цена $0,75/$3,75 (как у 3.7 Flash), кэш-скидка 90%; 1M контекст, 64K выход; AA v4.3.2 — 41, v5.0 — 31; скорость ~128 ток/с (AA, #3 по throughput среди ~195 моделей), TTFT ~13–25 с ([BenchLM](https://benchlm.ai/models/gemini-3-8-flash), [AA](https://artificialanalysis.ai/models/gemini-3-8-flash), [Codersera](https://codersera.com/blog/gemini-3-8-flash-complete-guide-2026/), [IntuitionLabs](https://intuitionlabs.ai/articles/gemini-3-8-flash-research-tasks-review)).

**Мой вывод.** *Всего: ≈800 млрд (400–1500); активных: ≈50 млрд (25–90).* Логика: цена выходного токена в 5,3 раза ниже Argon и скорость в ~1,5 раза выше; AA v5 31 против 50 — типичный профиль среднего MoE-яруса. Отрытые якоря: DeepSeek V4.1 Flash (40 на v5) и MiniMax M3.1 Flash (29) — модели этого класса держат 25–90 млрд активных; слухи о «семействе Gemini 3» в 2–4 трлн ([ExpertBeacon](https://expertbeacon.com/gemini-3-0-technical-analysis-architecture/)) относятся к Pro-ядру, Flash — его уменьшенная версия. *Слои: ~70–90* (пропорционально меньше флагмана; прямых данных нет). *Петель нет* — при 128 ток/с никаких следов многократных проходов, а «thinking» здесь — CoT-токены, не рекуррентная глубина. *Эксперты*: не раскрыты; по родству с Gemma 4 — тонкозернистые с общим экспертом.

### 4. Gemini 3.5 Flash-Lite (21 июля 2026, вместе с 3.6 Flash)

**Подтверждено.** Карточка: «**Gemini 3.5 Flash-Lite основан на Gemini 3.1 Flash-Lite**» ([DeepMind](https://deepmind.google/models/model-cards/gemini-3-5-flash-lite/)). Отсечение знаний март 2026; 1M контекст, 64K выход, мультимодальный вход, текстовый выход; конфигурируемое thinking; цена $0,30/$2,50 (кэш $0,03); скорость ~350 ток/с по Google и ~490 по AA live; TTFT ~6 с; AA v4 — 36 (у 3.1 Flash-Lite было 25), v5.0 — 12 ([OrcaRouter](https://www.orcarouter.ai/blog/gemini-3-5-flash-lite), [Apiyi](https://help.apiyi.com/en/gemini-api-argon-flash-flash-lite-selection-guide-en.html), [VentureBeat](https://venturebeat.com/technology/googles-gemini-3-6-flash-model-cuts-ai-agent-token-costs-by-up-65-on-long-horizon-engineering-tasks-and-3-5-pro-is-on-the-way)).

**Мой вывод.** *Всего: ≈150 млрд (60–400); активных: ≈20 млрд (8–40).* Логика: самый дешёвый и быстрый тир Google; цена выходного токена в 8 раз ниже Argon, декод в ~6 раз быстрее; AA v5 12 — ниже Kimi K3.1 Pro (46) и DeepSeek V4.1 Flash (40), в районе MiMo-V2.6-Flash (27) и ниже. Поколенческий сдвиг цены ($0,10/$0,40 у 2.5 Flash-Lite → $0,30/$2.50) и рост индекса на 11 пунктов v4 намекают, что это уже не «малыш» уровня Gemma (26B-A3.8B — собственная on-device модель Google), а MoE на пару десятков миллиардов активных. *Слои: ~40–60* (вывод). *Петель нет.* Дистилляция из Flash-линейки вероятна (модель «обходит Gemini 3 Flash на агентных задачах» при цене в разы ниже), но карточка это не подтверждает.

### 5. Gemini 3.5 Transcribe и Transcribe Live (26 августа 2026)

**Подтверждено.** Две версии: `gemini-3.5-transcribe` (Interactions API, записи ≤60 мин) и `gemini-3.5-transcribe-live` (Live API, сессии ≤10 мин, задержка ниже секунды). WER 2,6% (запись) / 4,0% (стрим) по Artificial Analysis; FLEURS 5,04/5,50%; 85+ языков с автопереключением внутри фразы; словарь до 1000 терминов; режимы verbatim/smart (уборка дисфлюенций — сама модель, не постпроцессинг); диаризация до 3 спикеров (3+ экспериментально, максимум 8); функция делегирования задач другим Gemini — только в приложении, в API function calling не поддерживается ([блог Google](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-5-transcribe/), [AI Wiki с цитатами карточки модели](https://aiwiki.ai/wiki/gemini_3_5_transcribe)).

**Ключевой подтверждённый факт**: карточка относит обе версии к семейству «Gemini 3.5 Audio» и сообщает, что они **основаны на Gemini 3 Pro** (не на Flash!), с контекстом 96К токенов и выходом 32К; за архитектурой карточка отсылает к документации Gemini 3 Pro ([AI Wiki](https://aiwiki.ai/wiki/gemini_3_5_transcribe)).

**Мой вывод.**
- *Размер базы: сколько весит Gemini 3 Pro — главный источник неопределённости.* Циркулирующие оценки: >1 трлн всего / 15–20 млрд активных ([Atoms.dev](https://atoms.dev/insights/gemini-3-pro-a-comprehensive-analysis-of-googles-advanced-multimodal-ai/58ca5df7013541208505f466bbb9172a), 1/5); 2–4 трлн / 150–200 млрд активных ([ExpertBeacon](https://expertbeacon.com/gemini-3-0-technical-analysis-architecture/), 2/5); слух «5 трлн MoE» ([Mark Kretschmann](https://x.com/mark_k/status/1991128458764693718), 1/5); «~7,5 трлн» с оговоркой о большой неопределённости ([@scaling01](https://x.com/scaling01/status/1990967279282987068), 2/5). Центральная оценка: **≈2,5 трлн всего (1–5), ≈100 млрд активных (30–200)**. Подтверждено лишь «sparse MoE» ([карточка Gemini 3 Pro](https://storage.googleapis.com/deepmind-media/Model-Cards/Gemini-3-Pro-Model-Card.pdf)).
- *Аудио-энкодер: USM/Chirp-линейка, ~1–3 млрд параметров.* USM — 2 млрд параметров, 32 Conformer-блока, 12 млн часов аудио ([InfoQ](https://www.infoq.com/news/2023/05/universal-speech-model/)); Chirp 3 сохранил Conformer-энкодер ([Miraheze](https://ai.miraheze.org/wiki/Chirp3)). Transcribe — следующее поколение после Chirp 3 ([блог Google](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-5-transcribe/)); заявление одного из обзоров о «Conformer-2»-энкодере и спекулятивном семантическом декодере ([AutoInterviewAI](https://www.autointerviewai.com/blog/gemini-3-5-transcribe-speech-to-text-review-2026)) — достоверность 1/5, механизм правдоподобен, но источники его не подтверждают.
- *Как работает стриминг (архитектурно).* Вывод: аудио нарезается на чанки, энкодер выдаёт ~32 текстовых токена в секунду аудио ([TokenCalc](https://www.tokencalc.org/video-audio-token-calculator) — официальные правила токенизации), декодер Gemini 3 Pro инкрементально эмиттит промежуточный (interim) и финальный текст, сохраняя контекст 96К для стиля, словаря и самокоррекций. Урезанный контекст (96К против 1M у Pro) и выход 32К — специализированная конфигурация для реального времени. Уверенность: механизм — средняя (вывод из официальных лимитов и заявленной суб-секундной задержки), числа — низкая.
- *Наследование:* важное следствие — Transcribe, вероятно, **самая тяжёлая модель транскрипции на рынке** (база уровня Pro против Whisper-класса у конкурентов), чем и объясняются WER 2,6%, «умное» форматирование и 85+ языков.

### 6. Nano Banana 2.1 / `gemini-nano-banana-2.1` (6 октября 2026)

**Подтверждено.** Карточка: «**Nano Banana 2.1 основан на Gemini 3.6 Flash**», входит в семейство Gemini 3; вход — текст и изображения (в API также видео и PDF), выход — изображение и текст; изображение до 4K токенов, текст до 64K; знание Gemini 3.6 Flash — март 2026 ([карточка DeepMind](https://deepmind.google/models/model-cards/nano-banana-2-1/)). API: вход 131 072 / выход 32 768 токенов, thinking-уровни, поиск-граундинг, до 14 референсных изображений, БЕЗ function calling и Live API ([документация](https://ai.google.dev/gemini-api/docs/models/gemini-nano-banana-2.1)). Цены: $30 за 1M image-токенов (вдвое ниже Nano Banana 2), изображение ≤1024×1024 = **1290 токенов ≈ $0,039** ([прайс API](https://ai.google.dev/gemini-api/docs/pricing), [Unite.AI](https://www.unite.ai/nano-banana-2-1-debuts-at-half-the-image-cost-of-its-predecessor/)).

**Механизм генерации — подтверждённая линия + вывод.**
- **Это авторегрессионная генерация image-токенов в едином мультимодальном пространстве, а не диффузия.** Для Nano Banana 2 это заявлено прямо: «не диффузионная модель», AR-трансформер, встроенный в языковую модель ([fal.ai](https://fal.ai/learn/tools/how-to-use-nano-banana-2), [Michael Lanham](https://micheallanham.substack.com/p/20-cool-things-with-nano-banana-2)); 2.1 как его апдейт на той же базе сохраняет механизм (карточка описывает идентичный конвейер, а цены за image-токены это подтверждают). Изображение 1K = 1290 токенов (2K ≈ 1680, 4K ≈ 2520 у предшественника; [Ofox](https://ofox.ai/blog/nano-banana-2-token-billing-reasoning-tokens-2026/)) — модель «пишет» картинку токенами в общем потоке с текстом, поэтому возможны multi-turn правки и характерная медленность.
- **Отдельный image-декодер (токены → пиксели) существует и не раскрыт.** Мой вывод по размеру: **~0,5–2 млрд параметров** — VQ-/трансформер-класс детокенайзер; точность 1K-изображений из ~1290 токенов подразумевает сжатие порядка 8×8×3 RGB-каналов на токен, типичное для современных image-токенизаторов. Уверенность низкая: Google механизм декодера не публиковал.
- *Размеры модели: база = Gemini 3.6 Flash* (та же линия, что 3.8 Flash): **≈700 млрд всего (400–1200), ≈45 млрд активных (25–80)** + энкодеры/декодер. 3.6 и 3.8 Flash — последовательные апдейты одной базы (3.6 «основан на 3.5», 3.8 «на 3.7»), поэтому оценки совпадают в пределах диапазона.
- *Гибридность:* чистого «AR + диффузионного рефайнера» (как у некоторых конкурентов) улик нет; против «гибрида» говорит плоская тарификация в image-токены и отсутствие ступеньки цены между 1K/2K/4K (2520 токенов за 4K — линейно по токенам, а не по шагам диффузии).

---

## Общие базы и родословные

| Группа | Модели | База | Уверенность |
|---|---|---|---|
| Gemini 4 (новый прогон предобучения) | Argon, Carbon | Одна база; Carbon = пост-трейнинг Argon | средняя |
| Flash-линия 2026 | 3.5 Flash → 3.6 Flash → 3.7 Flash → 3.8 Flash (+Cyber), Nano Banana 2.1 (через 3.6) | Одна предобученная база уровня Gemini 3 Flash, итеративные апдейты | высокая (карточки) |
| Flash-Lite-линия | 3.1 Flash-Lite → 3.5 Flash-Lite | своя линия, предположительно дистиллят Flash-генологии Gemini 3 | средняя |
| Pro-линия | Gemini 3 Pro → 3.1 Pro (февраль 2026) → **Transcribe** (через «Gemini 3.5 Audio») | База Gemini 3 Pro | высокая (карточка) |

- **Carbon = Argon + пост-трейнинг, а не большая модель** — см. раздел 2; главный контраргумент (двукратный TTFT) объясняется длиной размышлений, а не размером.
- **Flash-Lite, Flash и Transcribe — НЕ одна база**: Flash и Flash-Lite, вероятно, происходят от общего корня (Gemini 3 Flash, обучен с нуля в конце 2025), но разошлись как минимум к 3.1-поколению; Transcribe вообще сидит на Pro-ядре. Nano Banana 2.1 сидит на Flash-базе (3.6), а значит, косвенно связан и с 3.8 Flash.
- **Смена имён как улика**: Google отложил Gemini 3.5 Pro (план июня 2026), признал отставание в коде/агентах и перескочил к «Gemini 4» с новой номенклатурой химических элементов (Argon → Carbon) ([ITBear](https://www.itbear.com.cn/html/2026-07/1466725.html)). Суффиксы Flash/Flash-Lite остались только в линии 3.x. Знание Argon (март 2026) совпадает с 3.6/3.5-поколением — данные те же, прогон новый.

---

## Экономика сервинга: триангуляция

| Модель | Вход/выход ($/1M) | Кэш | Скорость (ток/с) | TTFT | AA v5.0 | Стоимость задачи (AA) |
|---|---|---|---|---|---|---|
| 3.5 Flash-Lite | $0,30 / $2,50 | $0,03 | ~490 (AA) | ~6 с | 12 | ~$0,09 |
| 3.8 Flash | $0,75 / $3,75 | 90% скидка | ~128 | 13–25 с | 31 | ~$0,58 |
| Argon | $2/$10 → **$4/$20 с 1 дек.** | 95% ($0,10→$0,20) | ~83 | 45–48 с | 50 | $1,99 → $3,98 |
| Carbon | $2/$10 → $4/$20 | 95% | ~100 | 97–104 с | 59 | $7,76 (станд.) |
| (якорь) GPT-6 Astra | $10 / $50 | — | — | — | 53 (v4.x)/выше v5 | $3,26–6,25 |

Источники: [BenchLM Argon](https://benchlm.ai/models/gemini-4-argon), [AA Argon](https://artificialanalysis.ai/articles/gemini-4-argon-google-top-three-labs), [AA Carbon](https://artificialanalysis.ai/articles/gemini-4-carbon-new-number-1), [Beri.net](https://www.beri.net/article/gemini-4-carbon-launch-fairwind-cyber-defenders-only-pricing-2-10-then-4-20-artificial-analysis-59-sec-bench-vs-argon), [IntelligentLiving](https://www.intelligentliving.co/gemini-4-carbon-ai-crown-price/), [IntuitionLabs](https://intuitionlabs.ai/articles/gemini-3-8-flash-research-tasks-review), [OrcaRouter](https://www.orcarouter.ai/blog/gemini-3-5-flash-lite).

**Железо.** Gemini обучается и сервится на TPU (JAX, ML Pathways — карточка). Ironwood (TPU v7, GA ноябрь 2025): 9216 чипов в суперподе, 192 ГБ HBM3e на чип → **1,77 ПБ прямой адресуемой памяти на суперпод**, оптическая коммутация OCS, «спроектирован для thinking-моделей и MoE» ([ServeTheHome](https://www.servethehome.com/google-ironwood-tpu-swings-for-reasoning-model-leadership-at-hot-chips-2025/), [документация TPU7x](https://docs.cloud.google.com/tpu/docs/tpu7x), [Jeff Dean](https://x.com/JeffDean/status/1986581028191047867)). Вывод: модель с ~4,5 трлн параметров в bf16 (~9 ТБ) размещается на крошечной доле суперпода, а связанность памятью декода объясняет, почему **скорость вывода — лучший прокси для активных параметров**: отношение цен Argon/Flash/Flash-Lite (20/3,75/2,5) и обратное отношение скоростей (83/128/490) дают согласованные оценки активных ~300/50/20 млрд. Оговорка: TPU-скорости напрямую не сопоставимы с Nvidia-сервингом (Astra, Sol), поэтому перекрёстное сравнение с OpenAI по скорости некорректно — сравнение только по цене и интеллекту.

**Калибровка по интеллекту.** AA v5.0: Flash-Lite 12 → 3.8 Flash 31 → Argon 50 → Carbon 59; открытые якоря 2026 года: Kimi K3.1 Pro 46 (2,8T-A104B), DeepSeek V4.1 Flash 40, MiniMax M3.1 Flash 29, Grok 4.7 (xhigh) 34, Claude Opus 5.5 58, GPT-6.1 Sol 55. Кривая «активные параметры → интеллект» у этих моделей монотонна и помещает Argon/Carbon в класс 100–500 млрд активных, а Flash — в 25–90 млрд; фактическое знание (AA-Omniscience: Argon 42→Carbon 54 v1.1) согласуется с этим же порядком ([AA](https://artificialanalysis.ai/articles/gemini-4-carbon-new-number-1), [OrcaRouter-лента](https://www.orcarouter.ai/blog/openai-astra-gpt-6-leak)).

---

## Противоречия источников

1. **Версии индекса AA**: Argon 53 (v4.x, запуск) против 50 (v5.0); 3.8 Flash 41 (v4.3.2) против 31 (v5.0); Flash-Lite 36 (v4) против 12 (v5.0). Это не ошибка, а пересборка индекса 27 октября ([AA](https://artificialanalysis.ai/articles/gemini-4-carbon-new-number-1), [Codersera](https://codersera.com/blog/gemini-3-8-flash-complete-guide-2026/), [Apiyi](https://help.apiyi.com/en/gemini-api-argon-flash-flash-lite-selection-guide-en.html)) — но любые статьи, смешивающие версии, ненадёжны.
2. **Контекст Nano Banana 2.1**: карточка — «до 1M токенов» ([DeepMind](https://deepmind.google/models/model-cards/nano-banana-2-1/)); документация API — вход 131 072 ([ai.google.dev](https://ai.google.dev/gemini-api/docs/models/gemini-nano-banana-2.1)).
3. **Цена изображения NB 2.1**: официальные $0,039 за 1K (1290 токенов) ([прайс](https://ai.google.dev/gemini-api/docs/pricing)) против $0,0336 у сторонних калькуляторов (1120 токенов — тариф NB 2.0) ([Layer3Labs](https://www.layer3labs.io/guides/nano-banana-2-1-api-pricing)).
4. **Лимит записи Transcribe**: 15 минут (страница модели Agent Platform) против 60 минут (Developer API и прайс) ([AI Wiki](https://aiwiki.ai/wiki/gemini_3_5_transcribe)).
5. **Скорость Flash-Lite**: 350 ток/с (Google) против ~490 (AA live) ([OrcaRouter](https://www.orcarouter.ai/blog/gemini-3-5-flash-lite)).
6. **Computer use во Flash-Lite**: «встроено» (блог Google) против «не поддерживается» (API-документация) ([OrcaRouter](https://www.orcarouter.ai/blog/gemini-3-5-flash-lite)).
7. **Размер Argon**: «до 1,6 трлн» ([dev.to](https://dev.to/naveenmalothu/getting-hands-on-with-gemini-4-argon-what-it-is-why-it-matters-and-how-to-plug-it-into-your-stack-2h9h), 1/5) против «5–6 трлн, 400–500 млрд активных» ([fundaai](https://fundaai.substack.com/p/researchllm-gemini-4-brings-google), 2/5) против официального молчания.
8. **Размер Gemini 3 Pro** (база Transcribe): >1T / 15–20 млрд активных ([Atoms.dev](https://atoms.dev/insights/gemini-3-pro-a-comprehensive-analysis-of-googles-advanced-multimodal-ai/58ca5df7013541208505f466bbb9172a)) — 2–4T / 150–200 млрд ([ExpertBeacon](https://expertbeacon.com/gemini-3-0-technical-analysis-architecture/)) — 5T ([X](https://x.com/mark_k/status/1991128458764693718)) — 7,5T ([X](https://x.com/scaling01/status/1990967279282987068)). Разброс в 7 раз; ни одна оценка не подтверждена.
9. **Размер GPT-6 Astra** (якорь для калибровки): ~3,5 трлн (оценка из постановки задачи) — 4,2T/120 млрд активных/112 слоёв ([OrcaRouter о @scaling01](https://www.orcarouter.ai/blog/openai-astra-gpt-6-leak)) — 4,8T ([Ed Zitron](https://x.com/edzitron/status/2096961600825462850)) — «~10T» ([TeamoRouter](https://teamorouter.com/blogs/gpt-6-astra-model-size)).
10. **Галлюцинации Argon**: 15% (AA-Omniscience v1.0) против «4%» как базы для сравнения Carbon (v1.1) — разные версии бенчмарка ([AA Argon](https://artificialanalysis.ai/articles/gemini-4-argon-google-top-three-labs), [AA Carbon](https://artificialanalysis.ai/articles/gemini-4-carbon-new-number-1)).
11. **TTFT Argon/Carbon**: 44,96 с / 97,48 с (BenchLM, OrcaRouter) против 48,07 с / 103,54 с (AA-сравнение) — разные снимки измерений.

---

## Примечания об источниках

| Источник | Достоверность | Обновлено |
|---|---|---|
| [Блог Google: Gemini 4 Argon](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-4-argon/) | 5/5 | 30.09.2026 |
| [Блог Google: Gemini 4 Carbon](https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-carbon/) | 5/5 | 28.10.2026 |
| [Блог Google: Gemini 3.5 Transcribe](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-5-transcribe/) | 5/5 | 26.08.2026 |
| [Карточка Nano Banana 2.1 (DeepMind)](https://deepmind.google/models/model-cards/nano-banana-2-1/) | 5/5 | октябрь 2026 |
| [Карточка Gemini 3.5 Flash-Lite (DeepMind)](https://deepmind.google/models/model-cards/gemini-3-5-flash-lite/) | 5/5 | июль 2026 |
| [Карточка Gemini 3 Pro (PDF)](https://storage.googleapis.com/deepmind-media/Model-Cards/Gemini-3-Pro-Model-Card.pdf) | 5/5 | ноябрь 2025 |
| [Документация Gemini API: nano-banana-2.1](https://ai.google.dev/gemini-api/docs/models/gemini-nano-banana-2.1) | 5/5 | 29.10.2026 |
| [Прайс-лист Gemini API](https://ai.google.dev/gemini-api/docs/pricing) | 5/5 | октябрь 2026 |
| [Обзор карточки Gemini 4 (Zvi Mowshowitz)](https://thezvi.wordpress.com/2026/10/26/gemini-4-argon-the-model-and-safety-cards/) | 4/5 | 26.10.2026 |
| [Artificial Analysis: Argon](https://artificialanalysis.ai/articles/gemini-4-argon-google-top-three-labs) | 5/5 | 30.09.2026 |
| [Artificial Analysis: Carbon](https://artificialanalysis.ai/articles/gemini-4-carbon-new-number-1) | 5/5 | 28.10.2026 |
| [Artificial Analysis: страница 3.8 Flash](https://artificialanalysis.ai/models/gemini-3-8-flash) | 5/5 | октябрь 2026 |
| [Artificial Analysis: сравнение Carbon vs Argon](https://artificialanalysis.ai/models/comparisons/gemini-4-carbon-vs-gemini-4-argon) | 5/5 | октябрь 2026 |
| [BenchLM: Gemini 4 Argon](https://benchlm.ai/models/gemini-4-argon) | 4/5 | 29.10.2026 |
| [Техноотчёт Gemini 2.5 (arXiv)](https://arxiv.org/html/2507.06261v1) | 5/5 | июль 2025 |
| [MarkTechPost: релиз API Argon](https://www.marktechpost.com/2026/10/13/google-gemini-4-argon-api-release/) | 4/5 | 13.10.2026 |
| [AI Wiki: Gemini 3.5 Transcribe (цитаты карточки)](https://aiwiki.ai/wiki/gemini_3_5_transcribe) | 3/5 | 2026 |
| [AI/TLDR: Gemini 3.8 Flash (карточка)](https://ai-tldr.dev/models/gemini-3-8-flash/) | 3/5 | сентябрь 2026 |
| [OrcaRouter: Gemini 3.5 Flash-Lite](https://www.orcarouter.ai/blog/gemini-3-5-flash-lite) | 3/5 | июль 2026 |
| [OrcaRouter: Carbon vs Argon](https://www.orcarouter.ai/blog/gemini-4-carbon-vs-gemini-4-argon) | 3/5 | 28.10.2026 |
| [OrcaRouter: архитектурные оценки GPT-6 Astra](https://www.orcarouter.ai/blog/openai-astra-gpt-6-leak) | 3/5 | сентябрь–октябрь 2026 |
| [Apiyi: гайд Argon/Flash/Flash-Lite, AA v5.0](https://help.apiyi.com/en/gemini-api-argon-flash-flash-lite-selection-guide-en.html) | 3/5 | октябрь 2026 |
| [VentureBeat: 3.6 Flash и Flash-Lite](https://venturebeat.com/technology/googles-gemini-3-6-flash-model-cuts-ai-agent-token-costs-by-up-65-on-long-horizon-engineering-tasks-and-3-5-pro-is-on-the-way) | 4/5 | июль 2026 |
| [Конфиг Gemma 4 26B A4B (HF)](https://hf-mirror.com/google/gemma-4-31B-it) | 5/5 | апрель 2026 |
| [Sebastian Raschka: заметки об архитектуре Gemma 4](https://sebastianraschka.com/blog/2026/gemma-4-release-notes.html) | 4/5 | 2026 |
| [InfoQ: Universal Speech Model](https://www.infoq.com/news/2023/05/universal-speech-model/) | 5/5 | май 2023 |
| [ServeTheHome: Ironwood на Hot Chips](https://www.servethehome.com/google-ironwood-tpu-swings-for-reasoning-model-leadership-at-hot-chips-2025/) | 4/5 | август 2025 |
| [Документация Google Cloud TPU7x](https://docs.cloud.google.com/tpu/docs/tpu7x) | 5/5 | 2025 |
| [Jeff Dean в X: доступность Ironwood](https://x.com/JeffDean/status/1986581028191047867) | 5/5 | ноябрь 2025 |
| [fundaai (Substack): отраслевые проверки Gemini 4](https://fundaai.substack.com/p/researchllm-gemini-4-brings-google) | 2/5 | октябрь 2026 |
| [@scaling01 в X: оценка Gemini 3 Pro](https://x.com/scaling01/status/1990967279282987068) | 2/5 | 18.11.2025 |
| [Ed Zitron в X: оценки Astra/Sol](https://x.com/edzitron/status/2096961600825462850) | 2/5 | 2026 |
| [ExpertBeacon: слухи о Gemini 3](https://expertbeacon.com/gemini-3-0-technical-analysis-architecture/) | 2/5 | 2025 |
| [Atoms.dev: анализ Gemini 3 Pro](https://atoms.dev/insights/gemini-3-pro-a-comprehensive-analysis-of-googles-advanced-multimodal-ai/58ca5df7013541208505f466bbb9172a) | 1/5 | 2025 |
| [dev.to: Argon «1,6 трлн»](https://dev.to/naveenmalothu/getting-hands-on-with-gemini-4-argon-what-it-is-why-it-matters-and-how-to-plug-it-into-your-stack-2h9h) | 1/5 | октябрь 2026 |
| [fal.ai: гайд по Nano Banana 2](https://fal.ai/learn/tools/how-to-use-nano-banana-2) | 4/5 | 2026 |

**Ключевая оговорка**: ни один источник не содержит официальных чисел параметров, слоёв или экспертов для закрытых моделей Google. Все цифры размеров в этом отчёте — триангуляция; центральные значения следует читать как «наиболее правдоподобные», а диапазоны — как честные границы неопределённости.

---

## Открытые вопросы

1. **Есть ли в Gemini 4 петли (recurrent depth)?** Единственная улика — «three loops» из отраслевых проверок ([fundaai](https://fundaai.substack.com/p/researchllm-gemini-4-brings-google)); Google это не подтверждал. Если петли есть, оценки активных параметров по скорости вывода нужно делить на число проходов.
2. **Сколько экспертов и какие общие?** Прямых улик ноль; вывод целиком опирается на родословную Gemma 4 (128/8/1).
3. **Размеры энкодеров** (видео/аудио) не публиковались со времён Gemini 1.0; оценки 0,5–3 млрд — наследие USM (2 млрд) и ViT-класса.
4. **Механизм image-декодера Nano Banana** (чистый AR-детокенайзер против AR+диффузионного рефайнера) не раскрыт.
5. **Какая часть Gemini 3 Pro реально работает в Transcribe** — полный стек или урезанная конфигурация (96К контекст намекает на специализированную сборку, но это не доказано).
6. **Глубина дистилляции** во Flash-Lite: Google упоминает дистилляцию в отчёте безопасности Argon, но не раскрывает, кто кого дистиллирует.
7. **Контекст NB 2.1**: чем объясняется расхождение «до 1M» (карточка) и 131 072 (API) — продуктовым лимитом или разными сборками.

---

## Рекомендации и следующие шаги

1. **Для планирования ёмкости** используйте диапазоны, а не центральные значения: Argon/Carbon 2,5–8 трлн (активные 120–500 млрд), 3.8 Flash 0,4–1,5 трлн (25–90 млрд), Flash-Lite 60–400 млрд (8–40 млрд).
2. **Следите за техноотчётом Gemini 4**: техноотчёт Gemini .5 вышел в arXiv через месяцы после релиза ([arXiv](https://arxiv.org/html/2507.06261v1)); если Google повторит практику — ищите подтверждение/опровержение оценки «5–6 трлн» и конфигурации экспертов.
3. **До 1 декабря 2026** фиксируйте вводные цены Argon/Carbon ($2/$10) и Batch/Flex (−50%) — с 1 декабря стандартные тарифы удваиваются ([BenchLM](https://benchlm.ai/models/gemini-4-argon)).
4. **Для задач транскрипции** закладывайте, что Transcribe — тяжёлая Pro-уровневая модель: WER 2,6% и «умное» форматирование оплачиваются Latency-профилем live-сессий (лимит 10 минут).
5. **Не сравнивайте оценки AA v4.x и v5.0** и всегда уточняйте версию индекса при цитировании (особенно для Flash-моделей, потерявших 5–24 пункта при пересборке).
6. **При апдейте отчёта** первыми проверять: карточки моделей DeepMind (графа «Model dependencies» — единственное официальное раскрытие родословной), прайс-лист API, страницы моделей AA и X-аккаунты @scaling01 / аналитиков SemiAnalysis.