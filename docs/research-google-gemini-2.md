# Оценка архитектур закрытых моделей Google Gemini (конец октября 2026)

**Метод.** Google не публикует параметры закрытых моделей — это подтверждено проверкой всех карточек и документации: в базе Epoch AI у Gemini 4 Argon поля параметров и вычислений помечены «Unknown» ([epoch.ai](https://epoch.ai/models/gemini-4-argon)). Поэтому всё численное ниже — либо официально подтверждённые факты (класс архитектуры, контексты, цены, скорости), либо оценки, построенные на трёх независимых опорах: (а) документированная генеалогия моделей по карточкам, (б) экономика инференса (цена × скорость × TPU), (в) калибровка по открытым моделям 2026 года с известными конфигами и по открытой линейке Gemma 4. Каждое число помечено: **[подтверждено]** (первоисточник Google/AA), **[сообщение]** (достоверная публикация без цифр Google), **[вывод]** (моя экстраполяция). Данные собраны 30.10–01.11.2026.

---

## 1. Сводная таблица

| Модель | Всего параметров (центр; диапазон) | Активных на токен | Слои (и «петли») | Эксперты (всего/активных/shared) | Вне главных слоёв | Уверенность | Ключевые улики |
|---|---|---|---|---|---|---|---|
| **Gemini 4 Argon** | ~1,2T; 0,6–2,5T **[вывод]** | ~50B; 30–120B **[вывод]** | нет данных; паттерн 5:1 local:global правдоподобен; признаков рекуррентности/петель нет **[вывод]** | нет данных; стиль Google: fine-grained, top-k≈8, вероятно без shared **[вывод]** | vision+audio энкодеры (~1–3B суммарно, вывод); embeddings 262 144 vocab (токенайзер общий с Gemma 4) **[подтверждено — словарь]** | низкая–средняя | Карточка: «large scale sparse MoE», TPUs, JAX+Pathways, «не файн-тюн предыдущей» |
| **Gemini 4 Carbon** | как Argon, если та же база: ~1,2T; до 2,5T при увеличении **[вывод]** | ~50B; до ~120B **[вывод]** | нет данных | нет данных | как Argon | низкая | Та же интро-цена и cost/task, что Argon; +9 пунктов индекса; TTFT 97,5 c |
| **Gemini 3.8 Flash** | ~150B; 80–400B **[вывод]** | ~10B; 5–25B **[вывод]** | нет данных; sparse MoE по наследству от базы 3 Pro **[подтверждено — класс]** | нет данных | энкодеры семейства 3 Pro | низкая | Карточка: «based on Gemini 3.7 Flash» → цепочка до 3 Pro; $0,75/$3,75; 121–126 tok/s |
| **Gemini 3.5 Flash-Lite** | ~30B; 15–80B **[вывод]** | ~3B; 1–6B **[вывод]** | нет данных; класс — sparse MoE базы 3 Pro **[подтверждено — класс]** | нет данных | энкодеры базы 3 Pro | средняя (нижняя граница) | 350–439 tok/s при $0,30 входа; карточка: «based on Gemini 3.1 Flash-Lite», та — «based on Gemini 3 Pro» |
| **Gemini 3.5 Transcribe** | не оценивается надёжно: выделенный ASR ~2–5B ИЛИ LLM-декодер класса Flash ~10–100B+ **[вывод, два сценария]** | н/п | нет данных | н/п | аудиоэнкодер USM-линии ~1–3B (центр ~2B) **[вывод]** | низкая | «Based on Gemini's audio understanding»; преемник Chirp 3; USM = 2B/12M часов |
| **Nano Banana 2.1** | база 3.6 Flash (якорь класса Flash: ~100–300B total / 5–15B active — вывод) + image-стек | база как у Flash | нет данных | нет данных | image-токенайзер + декодер/апсемплер ~1–3B сверх базы **[вывод]** | низкая | Карточка: «based on Gemini 3.6 Flash»; цена ×1,5 на шаг ×4 пикселей (×2,25 от 1K к 4K); ~4 с на 1K |

«н/п» — не определено; диапазоны — порядки величины, а не точные значения.

---

## 2. Что подтверждено официально (каркас, на котором держатся оценки)

**2.1. Обе «большие» базы — sparse MoE.** Карточка Gemini 3 Pro (терминал генеалогии 3-й серии): «Gemini 3 Pro is a sparse mixture-of-experts (MoE) … transformer-based models … with native multimodal support for text, vision, and audio inputs» и объяснение: «Sparse MoE models activate a subset of model parameters per input token … decouple total model capacity from computation and serving cost per token» ([карточка 3 Pro](https://deepmind.google/models/model-cards/gemini-3-pro)) **[подтверждено]**. Та же формулировка дословно у Gemini 4 Argon ([карточка Argon](https://deepmind.google/models/model-cards/gemini-4-argon)) **[подтверждено]**.

**2.2. Документированная генеалогия (карточки 3 Pro, 3 Flash, 3.5/3.6/3.8 Flash, 3.1/3.5 Flash-Lite, NB2.1 проверены 01.11.2026).** Карточка 3 Pro прямо перечисляет семейство: «Each subsequent model in the Gemini 3 Pro family is based on Gemini 3 Pro. The Gemini 3 Pro family includes: Gemini 3 Pro Image, Gemini 3 Flash, Gemini 3.1 Pro, Gemini 3.1 Flash Image, Gemini 3.1 Flash-Lite, Gemini 3.1 Flash Live, and Gemini 3.5 Flash» **[подтверждено]**. Цепочки «based on»: подтверждённая ветка Flash-линии — 3.6 Flash → 3.5 Flash → 3 Flash → 3 Pro; карточка 3.8 Flash отсылает к 3.7 Flash, но звено 3.7 → 3.6 документально не прослежено (карточки 3.7 в проверке нет); 3.5 Flash-Lite → 3.1 Flash-Lite → 3 Pro; Nano Banana 2.1 → 3.6 Flash. То есть **вся Flash/Lite/NB-линейка — потомки одной базы Gemini 3 Pro**; Argon — «not a modification or a fine-tune of a prior model», новая база **[подтверждено]**.

**2.3. Железо и софт.** Тренировка на TPUs, JAX + ML Pathways — в карточках 3 Pro, 3 Flash, 3.1 Flash-Lite, Argon **[подтверждено]**. TPU-парк: Trillium v6e (918 TFLOPS bf16, 32 ГБ HBM, 1,64 ТБ/с на чип — [docs](https://docs.cloud.google.com/tpu/docs/v6e)), Ironwood v7 (9 216 чипов, 42,5 EF FP8 на под — [blog.google](https://blog.google/innovation-and-ai/infrastructure-and-cloud/google-cloud/ironwood-tpu-age-of-inference); на чип 4,6 PFLOPS FP8, 192 ГБ HBM3e, ~7,4 ТБ/с — [сообщение, вторичные источники]), 8-е поколение (TPU 8t/8i) анонсировано 22.04.2026 ([blog.google](https://blog.google/innovation-and-ai/infrastructure-and-cloud/google-cloud/eighth-generation-tpu-agentic-era)) **[подтверждено]**. Какое поколение сервит какую модель — не раскрывается.

**2.4. Стиль MoE от Google (открытый якорь).** Gemma 4 (техотчёт [arXiv:2607.02770](https://arxiv.org/abs/2607.02770), конфиги [26B-A4B](https://huggingface.co/google/gemma-4-26B-A4B-it), [31B](https://huggingface.co/google/gemma-4-31B-it)): MoE-вариант — 128 экспертов, top-8, **без shared expert**, 30 слоёв, hidden 2816; отношение total:active ≈ 8,75:1; dense-флагман 31B — 60 слоёв, hidden 5376; внимание 5:1 local:global со скользящим окном 1024, pp-RoPE (25% ротора на глобальных), K=V в глобальных слоях; словарь 262 144, и в отчёте сказано: «the same tokenizer as Gemini Team 2025» — **словарь/токенайзер документированно общие с Gemini** **[подтверждено]**. Перенос этих решений на закрытые модели — **[вывод]**.

**2.5. Чего нет.** Ни числа параметров, ни числа слоёв/экспертов, ни training FLOPs не раскрыты ни для одной закрытой модели; SemiAnalysis единственное косвенно пишет о проде: «MoE expert parameters use FP4» ([SemiAnalysis, 24.04.2026](https://newsletter.semianalysis.com/p/the-coding-assistant-breakdown-more)) **[сообщение]**.

---

## 3. Оценки по моделям

### 3.1. Gemini 4 Argon (`gemini-4-argon`, анонс 30.09.2026, GA 13.10.2026)

- **Класс: large-scale sparse MoE с нативными текст/зрение/аудио.** [подтверждено — карточка]. RL-пост-тренинг на reasoning/theorem-proving данных [подтверждено]. Не файн-тюн предыдущей модели [подтверждено] → новая база, а не апгрейд 3.x.
- **Всего ~1,2T (0,6–2,5T).** [вывод] Аргументы: (1) prefill-граница из цены: при $2/1M входа и 4,6 PFLOP/s FP8 чипа Ironwood суммарная параметрия, пробегаемая при префилле, не превышает ~0,5T на чип полосы вычислений, т.е. до ~2T при тензорной параллелизации на 4 чипа — большие плотные модели исключены, MoE на 1–2T влезает (расчёт: FLOPS чипа × утилизация ÷ цена входа); (2) peer-якорь: фронтир 2026 с качеством уровня Artificial Analysis Intelligence Index (II) ≈50 (Kimi K3, DeepSeek V4 Pro, Mistral Large 4) имеет 1,05–2,8T total ([проверка пиров](https://huggingface.co/moonshotai/Kimi-K3)); (3) Google называет Gemini 4 «significantly larger» предыдущих ([Forkast/The Information summit, 24.09.2026](https://finance.yahoo.com/technology/ai/articles/google-gemini-4-enters-post-122454510.html)) — при базе 3 Pro порядка ~1T (оценочно) это согласуется с 1,2T+.
- **Активных ~50B (30–120B).** [вывод] Decode-граница: 83 tok/s (Artificial Analysis, High) на 7,4 ТБ/с HBM3e при FP8 даёт ~58 ГБ весов на шаг ≈ 45–71B активных на «чип полосы» с учётом утилизации 50–80% ([AA](https://artificialanalysis.ai/models/gemini-4-argon)); peer-якорь даёт 40–104B активных для этого класса качества; спарситет 19–33× у пиров 2026 даёт 0,6–2,5T total при 30–120B active — всё сходится в одну картину.
- **Слои и «петли».** Публичных данных нет. Признаков рекуррентной глубины/зацикленных слоёв нет ни в одном материале; единственные «переиспользования» в стиле Google — K=V в глобальных слоях и shared-KV-слои в Gemma 4 (не рекуррентность), плюс speculative-drafting голова (отдельный маленький трансформер, не петля) [вывод]. Если паттерн Gemma 4 переносится, ждать чередование 5 локальных (SW 1024) : 1 глобальный слой; при hidden ~8–16K это порядок 60–120 слоёв — грубая экстраполяция [вывод, низкая уверенность].
- **Эксперты.** Числа не раскрыты. Правдоподобно: fine-grained эксперты с top-k≈8 (стиль Gemma 4: 128/top-8, ширина эксперта = hidden/4) и, вероятно, без shared expert — у Google в открытой конфигурации shared-экспертов нет вовсе, в отличие от DeepSeek/GLM [вывод].
- **Вне главных слоёв.** Энкодеры vision/audio обязательны (нативная мультимодальность, подтверждено); в Gemma 4 они занимают 550M + 305M, для фронтира логично больше — порядка 1–3B суммарно [вывод]. Эмбеддинги: словарь 262 144 (общий с Gemma 4, подтверждено); при tied-эмбеддингах и hidden ~8–16K это ~2–4B [вывод].
- **Сервинг-факты** [подтверждено]: единое окно 1 048 576 (вход+мышление+выход), long decode до 1M в хопах по 64K, thinking low/medium/high, implicit caching 95%, цены $2/$10 интро → $4/$20 с 01.12.2026, batch/flex 50%, priority 1,8× ([docs](https://ai.google.dev/gemini-api/docs/latest-model), [pricing](https://ai.google.dev/gemini-api/docs/pricing)).

### 3.2. Gemini 4 Carbon (`gemini-4-carbon`, анонс 28.10.2026, ограниченный роллаут)

- **Что известно** [подтверждено]: та же интро-цена $2/$10, что Argon; «builds on the same multi-layered safety and security stack of Argon»; «go a step further on alignment, and trained the model»; 2× uplift по генерации безопасного кода ([blog.google](https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-carbon)); AA Intelligence Index v5 = 59 против 50 у Argon при почти равной cost/task ($7,76 против $7,68) и равной цене $4/$20 ([AA](https://artificialanalysis.ai/articles/gemini-4-carbon-new-number-1)).
- **Всего/активных: центр — те же ~1,2T/~50B, что у Argon; верх диапазона до ~2,5T/~120B.** [вывод] Аргумент за «та же база + пост-тренинг»: ценовой паритет, почти одинаковая стоимость задачи, main прирост — выравнивание и «мышление» (Carbon генерит 123k выходных токенов на задачу против меньшего у Argon; медианный TTFT 97,5 c — модель долго думает до первого токена) — это покупка индексных очков пост-тренингом, а не размером [вывод, перевес ~60–70%]. Аргумент против: формально Google не сказала ни слова о размере, и «strongest model» допускает увеличение; исключить ×2 нельзя [сообщение-осторожность].
- **Слои/эксперты/вне слоёв:** нет данных; разумно принять как у Argon в базовом сценарии [вывод].
- Карточка Carbon на deepmind.google на момент проверки не публиковалась/не отдаётся (4 попытки загрузки 30.10–01.11) — все сведения о ней из блога, AA и прессы.

### 3.3. Gemini 3.8 Flash (`gemini-3.8-flash`, GA 02.09.2026)

- **Класс: sparse MoE по наследству.** Карточка: «Gemini 3.8 Flash is based on Gemini 3.7 Flash» ([карточка 3.8 Flash](https://deepmind.google/models/model-cards/gemini-3-8-flash)); звено 3.7 → 3.6 документально не зафиксировано (карточки 3.7 в проверке нет — известна только deprecation-связка «3.7 заменён на 3.8»). Подтверждённая цепочка до базы: 3.6 Flash → 3.5 Flash → 3 Flash → 3 Pro, где описан sparse MoE ([карточка 3 Flash](https://deepmind.google/models/model-cards/gemini-3-flash)) [подтверждено для класса; размеры не раскрыты].
- **Всего ~150B (80–400B), активных ~10B (5–25B).** [вывод] Аргументы: (1) price/throughput-лестница Google: Flash-Lite ($0,30; 439 tok/s) → 3.8 Flash ($0,75; 121–126 tok/s) → Argon ($2–4; 83 tok/s) — отношение цен 1 : 2,5 : 6,7–13,3 при обратном отношении скоростей; если цена ∝ активным параметрам внутри одной сервинг-стек-страты, 3.8 Flash сидит между «единицами миллиардов» и «50+B»; (2) peer-якорь снизу: gpt-oss-120b (117B/5,1B) и small-MoE класс 2026 дают 5–15B активных для качества II≈31; (3) позиционирование «most intelligent Flash model» с 1M контекстом требует видимо большей базы, чем Lite.
- **Факты** [подтверждено]: 1M вход / 64K выход, thinking low/med/high, cutoff март 2026, $0,75/$3,75 → $1,50/$7,50 с 01.01.2027, cache $0,075 + $0,50/1M·ч хранение ([pricing](https://ai.google.dev/gemini-api/docs/pricing), [карточка](https://deepmind.google/models/model-cards/gemini-3-8-flash)).

### 3.4. Gemini 3.5 Flash-Lite (`gemini-3.5-flash-lite`, GA 21.07.2026)

- **Происхождение.** Карточка: «Gemini 3.5 Flash-Lite is based on Gemini 3.1 Flash-Lite» (5 разделов отсылают к той карточке), а карточка 3.1 Flash-Lite: «based on Gemini 3 Pro» ([3.5 FL](https://deepmind.google/models/model-cards/gemini-3-5-flash-lite), [3.1 FL](https://deepmind.google/models/model-cards/gemini-3-1-flash-lite)) [подтверждено]. То есть Lite-ветка — облегчённый производной базы 3 Pro (по прецеденту Gemma и общепринятой практике — дистилляция, но слово «distilled» Google не употребляет [вывод]).
- **Всего ~30B (10–80B), активных ~3B (1–6B).** [вывод] Аргументы: (1) скорость 350 tok/s (заявка Google) / 439 tok/s (AA) — при 1,64 ТБ/с Trillium и FP8 это ~2–4B активных на поток — самый жёсткий физический ориентир во всём отчёте; (2) если та же sparsity 8–30×, total = 15–80B; (3) бенчмарки карточки 3.1 Flash-Lite — SimpleQA Verified 43,3% и GPQA Diamond 86,9% ([карточка 3.1 Flash-Lite](https://deepmind.google/models/model-cards/gemini-3-1-flash-lite)) [подтверждено] — выше моделей класса 5–10B, значит база не крошечная [вывод]. Это самая надёжная оценка отчёта снизу, но класс dense-vs-MoE не определён.
- **Факты** [подтверждено]: 1M вход / 64K выход, text/image/audio/video вход, cutoff март 2026 (часть доменов — январь 2025, «in line with the Gemini 3 Model Family»), $0,30 вход (model garden), AA II = 12 ([AA](https://artificialanalysis.ai/models/gemini-3-5-flash-lite)).

### 3.5. Gemini 3.5 Transcribe (+ `gemini-3.5-transcribe-live`), 26.08.2026

- **Тип архитектуры — официально двусмысленный.** С одной стороны: «a speech-to-text model based on Gemini's audio understanding capabilities» ([docs](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-transcribe)); с другой: live-вариант — «a dedicated, low-latency speech recognition pipeline rather than a conversational agent», и у модели выключены thinking/function calling/caching — флаги LLM-платформы, которые у классического ASR даже не существуют. Блог противопоставляет её «conventional speech recognition models» ([blog.google](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-5-transcribe)) [подтверждены формулировки]. Правдоподобнее всего гибрид: аудиоэнкодер USM-линии + специализированный декодер в инфраструктуре Gemini **[вывод]**.
- **Аудиоэнкодер ~1–3B (центр ~2B).** [вывод] Якорь: USM = «family of state-of-the-art speech models with 2B parameters trained on 12 million hours» ([arXiv:2303.01037](https://arxiv.org/abs/2303.01037)); Gemini 1 принимал «audio signals at 16kHz from USM features» ([Gemini 1 TR](https://arxiv.org/html/2312.11805v4)); live-API до сих пор требует 16 kHz PCM — линия сохраняется **[подтверждено для якорей, вывод для размера]**.
- **Общий размер не оценивается надёжно**: сценарий «выделенный ASR» даёт ~2–5B total; сценарий «LLM-декодер класса Flash» — десятки миллиардов. Разделить сценарии по публичным данным нечем [вывод, низкая уверенность].
- **Стриминг** [подтверждено — docs]: Live API поверх WebSockets; вход — raw 16-bit PCM 16 kHz mono чанками по 100 мс; двухуровневые гипотезы — `interim_input_transcription` (спекулятивные частичные) и `input_transcription` (финальные по паузе/концу реплики); VAD автоматический/гибридный/ручной; до 10 минут на сессию; в live нет диаризации и word-timestamps (только в файловом варианте до 1 ч, до 8 спикеров); 85+ языков, code-switching, кастомный словарь до 1000 терминов ([live docs](https://ai.google.dev/gemini-api/docs/live-api/live-transcribe)).
- **WER (разведено по бенчмаркам)** [подтверждено]: 2,6% не-стриминг / 4,0% стриминг — индекс Artificial Analysis; 5,50% стриминг / 5,04% не-стриминг — FLEURS (мультиязычный, «improving over Chirp 3»); «преемник Chirp 3» заявлен прямо; time-to-final улучшен на 70%.
- **Связь с Flash-Lite:** общая только версия «3.5» и поколение; официального заявления об общей базе нет [вывод, низкая уверенность].

### 3.6. Nano Banana 2.1 (`gemini-nano-banana-2.1`, 06.10.2026)

- **База.** Карточка: «Nano Banana 2.1 is based on Gemini 3.6 Flash» ([карточка](https://deepmind.google/models/model-cards/nano-banana-2-1)); 3.6 Flash, в свою очередь, «based on Gemini 3.5 Flash» [подтверждено]. Это изображение-специализация Flash-семейства, а не отдельная модель с нуля.
- **Механизм генерации: нативные image-токены внутри LM (AR-чтение) + апсемплер для 2K/4K.** [вывод] Аргументы: (1) Google описывает NB как «Gemini's native image generation capabilities», «Image and text output is generated in the response» — картинка рождается в ответе LM ([image docs](https://ai.google.dev/gemini-api/docs/image-generation)); (2) бюджет выхода меряется токенами, thinking-уровни (minimal/medium/high) меняют качество — это LM-механика, не standalone-диффузия; (3) цена растёт ×2,25 на каждый шаг разрешения ×4 пикселей ($0,0336 → $0,0504 → $0,0756) — суб-линейно к пикселям, что указывает на фиксированную латентную сетку + learned upsampling для 2K/4K ([the-decoder](https://the-decoder.com/googles-new-image-model-nano-banana-2-1-generates-better-images-for-less-money)); (4) ~4 с на 1K-картинку несовместимо с десятками шагов диффузионного сэмплера (слова «autoregressive»/«diffusion» Google не употребляет — официального вердикта нет, гибрид AR+refine исключить нельзя) [вывод].
- **Размер image-стека: ~1–3B сверх базы.** [вывод, низкая уверенность] Типичный VAE-токенайзер + декодер/апсемплер на порядок меньше Flash-базы; цена 1K-картинки эквивалентна ~9K текстовых выходных токенов 3.6 Flash при ~1,3–4K image-токенах — надбавка ×2,2 как раз покрывает тяжёлый декодер-проход [вывод].
- **Факты** [подтверждено]: API-лимиты 131 072 вход / 32 768 выход ([docs](https://ai.google.dev/gemini-api/docs/models/gemini-nano-banana-2.1)); 1K/2K/4K (default 1K); до 14 референсных изображений; Search grounding; SynthID; lineage: NB1 = 2.5 Flash Image → NB2 = 3.1 Flash Image (закрыт 29.10.2026) → NB2.1; Nano Banana Pro = Gemini 3 Pro Image (премиум, $0,134/$0,24 за 1K/4K) остаётся отдельным. Карточка при этом заявляет контекст «up to 1M» — конфликт с API-лимитом не разрешён официально (вероятно, capability базы vs сервинг-кап) [противоречие зафиксировано].

---

## 4. Общие базы: прямой ответ на вопрос

- **Carbon — та же база, что Argon?** Официально не зафиксировано. Доказуемо только «тот же safety-стек» и дополнительный тренинг выравнивания. Экономика (одинаковые цены, cost/task, скорости 82,5 vs 83 tok/s) и характер прироста (+9 индекса через «мышление», TTFT 97,5 c) указывают на **ту же базу с масштабным пост-тренингом** — перевес ~60–70%; вариант «заметно большая модель» не исключён [вывод + сообщение].
- **Flash-Lite, Flash, Transcribe — одна база?** Flash-ветка и Flash-Lite-ветка документированно сходятся к **одной базе Gemini 3 Pro** (две независимые цепочки карточек) [подтверждено]. Transcribe — без карточки и цепочки; связан с поколением 3.5 только версией и «Gemini audio understanding»; считать его производной базы 3 Pro правдоподобно, но недоказано [вывод]. Argon — единственный подтверждённо новый претрейн («не файн-тюн»), плюс анонсированный 21.07.2026 «most ambitious pre-training run yet, for Gemini 4» ([blog.google](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-6-flash-3-5-flash-lite-3-5-flash-cyber)) [подтверждено]; 12 недель от анонса до GA — либо лаг анонса, либо Argon из более раннего рана (см. противоречия).
- **Нейминг.** Pro/Flash/Flash-Lite дожили до 3.x; фронтир перескочил «3.5 Pro» (завис в партнёрском тестировании с июня 2026 и не вышел) сразу на «Gemini 4» с именами элементов (Argon, Carbon; пресса упоминала кодовое имя «Barium») [подтверждено даты; кодовые имена — сообщение].

---

## 5. Контекстные окна и модальности

| Модель | Контекст | Вход → Выход | Источник |
|---|---|---|---|
| Argon | 1 048 576 единое (вход+мышление+выход); выход по умолчанию 65 536, long decode до 1M−вход | text/image/audio/video → text; thinking low/med/high | [docs](https://ai.google.dev/gemini-api/docs/latest-model), [карточка](https://deepmind.google/models/model-cards/gemini-4-argon) |
| Carbon | 1M | text/image/video/speech → text | [AA](https://artificialanalysis.ai/articles/gemini-4-carbon-new-number-1) (карточки Google нет) |
| 3.8 Flash | 1M вход / 64K выход | text/image/audio/video → text; thinking low/med/high | [карточка](https://deepmind.google/models/model-cards/gemini-3-8-flash) |
| 3.5 Flash-Lite | 1M вход / 64K выход | text/image/audio/video → text | [карточка](https://deepmind.google/models/model-cards/gemini-3-5-flash-lite) |
| 3.5 Transcribe | файл до 1 ч (30 мин с диаризацией); live 10 мин/сессия | audio (16 kHz PCM) → text + word annotations | [docs](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-transcribe), [live](https://ai.google.dev/gemini-api/docs/live-api/live-transcribe) |
| NB 2.1 | API: 131 072 вход / 32 768 выход (карточка: «up to 1M» — конфликт) | text/image/video/PDF → image (1K/2K/4K) + text | [docs](https://ai.google.dev/gemini-api/docs/models/gemini-nano-banana-2.1) |

---

## 6. Противоречия между источниками

1. **Epoch Capabilities Index (ECI) Argon: 165 против 166** — дрейф снапшота Epoch (страница против X-поста); несущественно.
2. **AA II Flash-Lite: 12 против 36** — 12 с первичной страницы AA (индекс v5); 36 — агрегатор от августа со старой версией индекса. Принято 12.
3. **Скорость 3.8 Flash: 126 против 121 tok/s** — разные снапшоты/режимы AA; несущественно.
4. **В исходном запросе: «NB2 = Gemini 3 Pro Image (Nov 2025)»** — неверно по ченджлогу: NB2 = `gemini-3.1-flash-image`, NB **Pro** = `gemini-3-pro-image`; обе GA 28.05.2026. Исправлено.
5. **В исходном запросе: Mistral Large 4 «52B active», GLM-5.3 «753B»** — официально 49B и 744B (GLM-5); цифры запроса ошибочны. Исправлено.
6. **Троица OpenAI GPT-6.1 Terra ~480B / Sol ~1,25T / Astra ~3,5T** — источник не найден ни в одном поиске; существуют лишь конкурирующие утечки (Astra ~4,2T/120B у orcarouter; «10–20T» у lifearchitect). Числа использовать нельзя; не разрешено.
7. **TPU-сервинг Gemini 4: Ironwood против новых 8i** — публичной привязки модели к поколению нет; не разрешено.
8. **Carbon: та же база против большей модели** — см. §4; не разрешено (официально).
9. **NB2.1: AR-токены против гибрида с диффузией** — Google молчит; перевес AR+апсемплер; не разрешено официально.
10. **Transcribe: выделенный ASR против LLM+энкодер** — официальные формулировки двоятся; не разрешено.
11. **NB2.1: 131K (API) против 1M (карточка)** — вероятно, база против сервинг-лимита; не разрешено.
12. **«Претрейн Gemini 4 начат 21.07.2026» против GA Argon 13.10.2026 (12 недель)** — либо лаг анонса, либо Argon не из этого рана; не разрешено.
13. **«6.1e27 FLOP leaked slide» для Argon** — сам ретранслятор (FutureSearch) помечает как неподтверждённое; в ~6× выше их медианы прогнозов (9,5e26). Считать слухом.

---

## 7. Ограничения

- Все абсолютные числа параметров — **выводы** с ошибкой до ±1 порядка; надёжны только классы архитектуры, генеалогия, цены/скорости и якоря Gemma 4/пиров.
- TPU-сервинг не сравним напрямую с NVIDIA-сервингом: скорости AA — медианы живого трафика с пакетированием и, возможно, спекулятивным декодингом; это ослабляет decode-границу активных параметров.
- Отчёт отражает состояние на 30.10–01.11.2026; карточка Carbon и публичные материалы по ней могут появиться позже и сдвинуть §3.2.
- Полная библиография (≈80 источников с датами и цитатами) — в материалах исследования: `research/gemini-arch-20261030-1510/` (dive_01…dive_08, verify.md, insight.md, map.md).
