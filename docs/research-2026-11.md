# Масштаб и происхождение закрытых моделей ноября 2026: GPT-6.2 Astra и Sol, Gemini 4 Hydrogen, Qwen4-Max

*Дата: 18 ноября 2026. Метод: 7 направлений ресерча (~80 поисков), ключевые первоисточники прочитаны целиком и напрямую (launch-пост и системная карточка OpenAI, карточка Hydrogen + карточка Carbon, блог Qwen4-Max, прайс-страницы, страницы Artificial Analysis). Все цитаты дословные. Метки достоверности: **[confirmed]** — первичный источник или ≥2 независимых совпадения; **[credible]** — один надёжный источник/репортаж; **[rumor]** — слух; **[infer]** — моя экстраполяция. Релизам GPT-6.2 сутки, Hydrogen 6 дней, Qwen4-Max 2 дня — независимые замеры ещё дозревают.*

## TL;DR — вердикты

| Модель | Вердикт | Уверенность |
|---|---|---|
| **GPT-6.2 Astra** | Новый претрейн (минимум — continued pretrain с новым срезом данных). Не пост-тренинг весов GPT-6/6.1 | средняя |
| **GPT-6.2 Sol** | Скорее отдельный ран с новым срезом данных (cutoff +32 дня к 6.1 Sol); чистый пост-тренинг 6.1 Sol не исключён | низкая–средняя |
| **Gemini 4 Hydrogen** | Не претрейн. Официально «adapted from Gemini 4 Carbon»; механизм (дистилляция в меньшую модель vs те же веса с урезанным reasoning) официально не раскрыт | линия — высокая, механизм — низкая |
| **Qwen4-Max** | Новый претрейн на новой архитектуре Qwen4 — подтверждено официальным блогом | высокая |

Главное по масштабу: **ни одна из четырёх компаний не раскрыла архитектуру в числах** (слои/эксперты/top-k неизвестны для всех четырёх; у Qwen официально только total/active). Все оценки ниже — диапазоны с явной неуверенностью, калиброванные по открытым моделям известного размера (раздел 4).

---

## Сводная таблица

| Модель | Total params | Dense/MoE | Active params | Слои | Эксперты (top-k) | Вне слоёв | Контекст | Модальности | Cutoff | Уверенность | Ключевые свидетельства |
|---|---|---|---|---|---|---|---|---|---|---|---|
| GPT-6.2 Astra | нет данных ([infer]: ~3T, диапазон 2–4T) | MoE [infer], не подтверждено | нет данных ([infer]: ~150B-экв., диапазон 100–250B; низкое доверие) | нет данных | нет данных | нет данных (вход text+image) | 1,050,000 (922K in / 128K out) | text+image → text; audio/video нет | 18.05.2026 | API-спеки: высокая; архитектура: низкая | [карточка API](https://platform.openai.com/docs/models/gpt-6.2-astra), [AA](https://artificialanalysis.ai/models/gpt-6-2-astra) |
| GPT-6.2 Sol | нет данных ([infer]: ~1.1T, диапазон 0.8–1.5T) | MoE [infer], не подтверждено | нет данных ([infer]: ~70B-экв., диапазон 50–90B; низкое доверие) | нет данных | нет данных | нет данных | 1,050,000 (922K in / 128K out) | text+image → text | 01.06.2026 | API-спеки: высокая; архитектура: низкая | [карточка API](https://platform.openai.com/docs/models/gpt-6.2-sol), [AA](https://artificialanalysis.ai/models/gpt-6-2-sol) |
| Gemini 4 Hydrogen | не раскрыт ([infer]: ~0.6T, диапазон 0.3–1T, если отдельная модель) | неизвестно | не раскрыт ([infer]: ~60B-экв., диапазон 30–120B; низкое доверие) | нет данных | нет данных | нет данных | 1M combined (64K default out, до 1M background) | text+image+audio+video → text | март 2026 | спеки: высокая; масштаб: низкая | [model card](https://deepmind.google/models/model-cards/gemini-4-hydrogen/), [блог](https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-hydrogen) |
| Qwen4-Max | **2.4T backbone + 328B N-gram Embedding** (заявление вендора) | MoE (официально «new sparse MoE») | **71B** (заявление вендора; −25% к Qwen3.8-Max) | не раскрыты | не раскрыты | N-gram Embedding (lookup на 2-м слое); нативное зрение (энкодер не детализирован) | 1M | text + изображения (+видео по дока Model Studio); аудио не заявлено | не найден | числа как заявление: высокая; независимая проверка: невозможна до открытых весов | [блог](https://qwen.ai/blog?id=qwen4-max), [X-анонс](https://x.com/Alibaba_Qwen/status/2122148127520289151) |

Оценки из брифа (GPT-6 Astra 3.5T/220B, 6.1 Sol 1.25T/72B, Argon/Carbon 2.3T/122B, 3.8 Flash 346B/22B и т.д.) **ни одного публичного подтверждения не нашли** — см. раздел 5. Для Qwen3.8-Max (2.4T-A95B, 92 слоя, 512 экспертов top-10) числа подтвердились — [карточка HF](https://huggingface.co/Qwen/Qwen3.8-2.4T-A95B): «Number of Layers: 92 … Number of Experts: 512 … 10 Routed + 1 Shared», гибрид Gated DeltaNet + Gated Attention 3:1 [confirmed].

---

## 1. OpenAI GPT-6.2 Astra и GPT-6.2 Sol (релиз 17.11.2026)

### Вердикт: новый претрейн / отдельные раны, не пост-тренинг существующих весов — средняя уверенность

Аргументы:

1. **Knowledge cutoff сдвинулся.** GPT-6 Astra и GPT-6.1 Sol: Apr 30, 2026; GPT-6.2 Astra: «May 18, 2026 knowledge cutoff», GPT-6.2 Sol: «Jun 01, 2026 knowledge cutoff» — [карточка Astra](https://platform.openai.com/docs/models/gpt-6.2-astra), [карточка Sol](https://platform.openai.com/docs/models/gpt-6.2-sol) [confirmed]. Пост-тренинг knowledge cutoff не двигает — он задаётся претрейном/продолжением претрейна на свежих данных. Сдвиг на +18/+32 дня = в моделях есть новый претрейн-срез данных хотя бы лета 2026 [infer-интерпретация confirmed-факта].
2. **Cutoff'ы внутри поколения разные** (Astra May 18 vs Sol Jun 01) — значит, это не один ран с двумя пост-трейнами, а отдельные раны/срезы данных под каждую модель [infer; сам факт confirmed].
3. **OpenAI нигде не пишет «adapted/continued from»** — контраст с Google, которая прямо пишет «adapted from Carbon». Launch-пост ([openai.com](https://openai.com/index/introducing-gpt-6-2-astra-sol/), прочитан целиком) использует только «our new frontier model», «We trained GPT-6.2 Astra to…» — ничего о происхождении [confirmed-отсутствие]. Системная карточка ([Deployment Safety Hub](https://deploymentsafety.openai.com/gpt-6-2-astra-sol), publ. 17.11.2026) — раздел 1.1 «Model Data and Training» шаблонный, без чисел и без заявлений о lineage [confirmed].
4. **Контекст Bloomberg (через Quartz):** «OpenAI briefly halted training on its strongest models and resumed only recently» — тренировки шли/возобновились перед релизом; GPT-6.1 Astra была отменена в конце сентября из-за deception ([WSJ](https://www.wsj.com/tech/ai/openai-chatgpt-model-release-cancel-safety-5a2f9f42), [CSA](https://labs.cloudsecurityalliance.org/research/csa-research-note-gpt61-astra-deception-shelving-20260930-cs); суть подтверждает и Reuters) [credible]. Если раны остановили в конце сентября и 6.2 вышла 17 ноября — полный претрейн с нуля за 7 недель невозможен; значит раны стартовали раньше (cutoff May/Jun это подтверждает), а осенью шли пост-трейн/финиш [infer].
5. **Контраргумент** (честно): OpenAI может считать «continued pretrain + пост-тренинг» тем же «Astra»; публично различить «новый ран с нуля» и «продолженный претрейн» невозможно. Официальных слов нет ни в одну сторону.

### Что означает −20% цены у Astra при flat цене Sol

Официальное объяснение удешевления Astra — **не меньшая модель**: «costs significantly less per task than GPT-6 Astra, driven by better token efficiency, a 20% discount on input and output tokens, and a deeper 60% discount on cached input tokens» ([launch-пост](https://openai.com/index/introducing-gpt-6-2-astra-sol/)) [confirmed]. Конкретика: на внутреннем GDPval v2 Astra 6.2 «up 6.2 percentage points from GPT-6 Astra while using **22% fewer output tokens**» [confirmed]. То есть «меньше трети стоимости задачи» = меньше токенов × дешевле токен.

- Старые цены GPT-6 Astra: $10/$50, cached $1.00 — [AA](https://artificialanalysis.ai/models/gpt-6-2-astra), VentureBeat и [прайс-страница](https://developers.openai.com/api/docs/pricing) [confirmed]. Кэш $1.00→$0.40 и рекомендация «keeping prompt prefixes unchanged» намекают на переработку кэш-инфраструктуры, а не на изменение размера [infer].
- Sol 6.2 сохранил цену 6.1 Sol ($2/$10) при +2 пунктах AA II и радикально большем скорости/дешевизне задачи: AA — 7.9 мин/задачу против 22.7 у 6.1 Sol, $1.01 против $1.27 [confirmed]. Это больше похоже на improvement пост-трейна и/или сервинга, чем на смену размера [infer].
- Вывод по вопросу брифа: **ценовой сигнал не указывает на меньший размер**; intelligence вырос (+5/+2 AA II) при падении цены — комбинация token efficiency, пост-трейна и экономики сервинга [infer].

### Числа и основания

- **Цены Astra $8/$40/$0.40 cached** [confirmed]: карточка API + launch-пост + прайс-страница + AA. Ultrafast: «3 times the Standard rate through February 28, 2027, and 6 times… starting March 1, 2027» [confirmed]; $48/$240 из сниппетов — это Ultrafast-list с 01.03.2027, не Standard.
- **Цены Sol $2/$10/$0.10** [confirmed]: «GPT‑6.2 Sol carries forward GPT‑6.1 Sol's rates of $2 for input, $0.10 for cached input, and $10 for output per million tokens» (launch-пост).
- **Контекст 1,050,000 / 922K / 128K; вход text+image, выход text; audio/video и fine-tuning — нет** [confirmed]: карточки API обеих моделей.
- **AA Intelligence Index: Astra 62 (#3 из 91 на снапшоте 18.11), Sol 57 (#11)** [confirmed, страницы AA; ранг зависит от снапшота — в релизном посте AA Astra названа «#2»]: Astra — 10.4 мин/задачу, $4.00/задачу, 66 tok/s; Sol — 7.9 мин, $1.01, 85 tok/s. «Astra… particularly expensive… quicker than average per task… somewhat verbose»; Sol — «reasonably priced… fairly concise».
- **Фронтлайны сравнения** [confirmed, launch-пост]: Agents' Last Exam: «5.2 points higher than GPT‑6 Astra at less than a third of the cost, and 5.5 points ahead of Claude Fable 5.2 at just 5% of the cost»; FrontierCode 2.0: «GPT‑6.2 Sol comes within 0.5 points of GPT‑6.2 Astra at about one-fifth the cost (both at max)»; AA-3D Elo: Astra 1318 > Fable 5.2 1271 > Sol 1259.
- **Масштаб** — данных нет: никаких утечек параметров/слоёв/экспертов 6.2 не найдено [confirmed-отсутствие]. Диапазоны в таблице — [infer], калибровка в разделе 4; доверию к ним соответствует «низкое».

### Слухи вокруг GPT-6.2

- «gpt-6.2-betelgeuse» INTERNAL (Discord-embed, 30.10) и RC-идентификаторы «rc-ada-or/sh-vm» — внутренние ID, о размере ничего не говорят [rumor].
- «10-trillion-parameter model called Bell» — про **следующее** поколение, не 6.2 [rumor].
- Community-оценка GPT-6 Astra «1.1–1.8T compute-equivalent active parameters», «deeper without getting bigger» — back-of-envelope, к 6.2 не привязана [rumor]. Заметно расходится с оценкой брифа (220B active) — но «compute-equivalent» ≠ реальные активные параметры, сравнивать нельзя.

---

## 2. Google Gemini 4 Hydrogen (релиз 12.11.2026)

### Вердикт: адаптированная версия Gemini 4 Carbon, не новый претрейн — линия подтверждена официально; механизм не раскрыт

1. **Официальная формулировка одна и повторена 7 раз в карточке**: «Gemini 4 Hydrogen is adapted from Gemini 4 Carbon.» (Model dependencies, Architecture, Training Dataset, Training Data Processing, Hardware, Software, Acceptable Usage — каждый раздел отсылает к карточке Carbon) — [model card](https://deepmind.google/models/model-cards/gemini-4-hydrogen/) [confirmed]. Выше по цепочке: «Gemini 4 Carbon is based on Gemini 4 Argon.» — [карточка Carbon](https://deepmind.google/models/model-cards/gemini-4-carbon/) [confirmed]. Слов «distilled»/«derived»/«pruning» в прочитанных официальных документах **нет** [confirmed-отсутствие].
2. **Механизм «adapted» официально не разъяснён** — дистилляция в меньшую модель, pruning или те же веса с другим сервингом, Google не говорит. Внутренняя оговорка безопасности: «Gemini 4 Hydrogen did not show a material increase in general capability under our MCC assessment compared with Gemini 4 Argon» — Hydrogen не засчитан как рост способностей относительно Argon, что совместимо с адаптацией существующей линии, а не новым фронтиром [confirmed].
3. **Что говорит версия «отдельная меньшая модель»**: Flash-уровень цены ($7.50 output против $20 list у Carbon), вдвое меньшее время на задачу (15.6 мин против 31.8 у Carbon на AA), AA II 51 (high)/54 (xhigh) против 60 у Carbon — при этом на medium/low скоры падают до ~41/27 (чтение графиков AA сообществом [credible]) — профиль «модель, заточенная под высокий reasoning-бюджет», типичный для дистилляции на длинных цепочках [infer].
4. **Что говорит версия «Carbon с урезанным reasoning»**: та же заявленная «адаптированность», «no material increase» vs Argon, отсутствие каких-либо намёков на новые веса [infer]. Прямых улик ни у одной версии нет — честный ответ: **механизм неизвестен**.
5. Слух «дистилляция из GLM 5.3» противоречит официальной карточке — отбрасываю [rumor, низкое правдоподобие].

### Ценовой спор разрешён

Официально: «Gemini 4 Hydrogen is priced flat across its entire 1 million-token context window at **$1.50 per million input tokens and $7.50 per million output tokens**» ([блог Google, 12.11.2026](https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-hydrogen)) [confirmed]. Обе версии прессы верны: Hydrogen **вдвое дороже** промо-прайса 3.8 Flash ($0.75/$3.75 до 31.12.2026) и **ровно совпадает** с прайсом 3.8 Flash с 01.01.2027 ($1.50/$7.50) — [прайс Gemini API](https://ai.google.dev/gemini-api/docs/pricing) [confirmed]. В декабре Hydrogen дороже 3.8 Flash в 2 раза — «дешевой заменой Flash» его не называет ни один официальный источник [confirmed-отсутствие]. Carbon/Argon: $2/$10 до 30.11.2026 → $4/$20 с 01.12.2026 [confirmed].

### Числа и основания

- **Контекст 1M combined; вывод 64K default synchronous (до 1M через background long decode); вход text/images/audio/video; cutoff March 2026; 4 thinking levels (low, medium, high default, xhigh)** [confirmed]: карточка + блог + [AI Studio docs](https://aistudio.google.com/docs/whats-new-gemini-4-hydrogen).
- **AA II 51 (high) vs Argon 50; 54 (xhigh)** [confirmed — Google цитирует AA]; время/задачу 15.6 мин (high), $3.16/задачу, low — 1.4 мин (самый быстрый в выборке AA) [confirmed по сниппетам AA].
- **«2.5× быстрее 3.8 Flash»** [credible — заявление Google]: «finishing tasks 2.5 times faster at its high default setting while more than tripling Terminal-Bench 4.1 scores (57% vs. 18.2%)» (блог); партнёры «2x to 2.8x faster while reducing token usage by 12% to 23%». Независимого замера против 3.8 Flash нет [confirmed-отсутствие]; часть выигрыша может быть end-to-end за счёт экономии reasoning-токенов [infer].
- **Масштаб** — не раскрыт: «parameter count … not disclosed» (об Argon), в карточках Hydrogen/Carbon чисел нет [confirmed-отсутствие]. Оценки брифа (Argon/Carbon 2.3T/122B, 3.8 Flash 346B/22B) публично не подтверждаются и не опровергаются. Мой диапазон для Hydrogen в таблице — [infer], низкое доверие: против «совсем маленькой» (<30B active) — II 54 выше лучшего открытого (Kimi 46 при 104B active); против «полного Carbon» — цена и скорость.
- **Кэш**: OpenRouter — $0.075/MTok cache read; сниппет AI Studio — $0.15. Не разрешено [credible×2 противоречиво].

---

## 3. Alibaba Qwen4-Max (релиз 16.11.2026)

### Вердикт: новый претрейн на новой архитектуре Qwen4 — подтверждено официально (высокая уверенность)

1. **В блоге есть раздел «Pre-training»** — я прочитал его прямо на странице ([qwen.ai/blog?id=qwen4-max](https://qwen.ai/blog?id=qwen4-max)): «Qwen4-Max is built on a new architecture for the Qwen4 series… The architecture systematically upgrades the sparse MoE model across **attention, residual connections, and embeddings**… **Training at the 2.4T-parameter scale progressed smoothly, with loss decreasing steadily**…» и подпись к графику лосса: «**Smooth and stable pre-training of Qwen4-Max**» [confirmed]. Плюс base-vs-base сравнение: «Qwen4-Max-Base… improves on Qwen3.8-Max-Base in every domain… 5–13% lower BPB» и «lowest bits per byte (BPB) among all five evaluated checkpoints» (среди пяти чекпойнтов, включая GLM-5.3 и Kimi-K3.1-Pro — с оговоркой, что они post-trained) [confirmed]. Это описание полноценного претрейна с нуля на новой архитектуре, а не адаптации.
2. **Официальная архитектурная фраза — дословно с страницы** (в т.ч. из alt-текста фигуры): «built on a **new architecture for the Qwen4 series**, with **2.4T backbone parameters, 71B activated per token, and an additional 328B N-gram Embedding parameters**» [confirmed]. Ответ на вопрос брифа: цифра 2.4T/71B — **в официальном блоге**, не только в прессе; вся англоязычная и китайская пресса (AIwire/HPCwire — репринт пресс-релиза, 量子位 — «本文由阿里巴巴提供» авторизованный репост, Sohu, EET-China) трассируется к одному PR Alibaba [confirmed]. Независимая верификация невозможна до выхода открытых весов [confirmed-ограничение].
3. **Архитектурные детали (официально, из описаний фигур блога)** [confirmed]:
   - **GDN + Qwen Sparse Attention (QSA) 3:1**: «Three Gated DeltaNet layers compress history into fixed-size states for every QSA layer. QSA uses a lightweight indexer to select relevant context at micro-block granularity…»
   - **Gated Residual (GR)**: «Four parallel residual branches use dynamic read and write gates…»
   - **N-gram Embedding**: «Context-based lookups provide representations of local token patterns at the second layer, expanding model capacity with **little additional computation**». То есть 328B — отдельная n-граммная таблица «памяти», не визуальный энкодер и не неактивные MoE-параметры.
4. **Слои/эксперты/top-k/визуальный энкодер — официально не раскрыты** [confirmed-отсутствие]. Любые конкретные числа в обсуждениях — [rumor]. Для сравнения: открытый предшественник Qwen3.8-2.4T-A95B (95B active, 92 слоя, 512 экспертов 10+1, GDN+Gated Attention 3:1) публиковал всё это в карточке HF [confirmed].
5. **Линия с открытым превью архитектуры**: Qwen3.8-Flash-Next (август 2026, открытые веса: 125B main / 6B active + **51B n-gram embedding** + 4B MTP) описывался как experimental preview архитектуры будущих Qwen4; масштаб n-gram таблицы вырос 51B → 328B [credible — вторичный источник]. Это согласуется с «new Qwen4 architecture», обкатанной заранее [infer].

### Числа и основания

- **Цены $1.5/$4.5/$0.075 implicit cache** [confirmed]: «$1.5/M tokens for input, $4.5/M tokens for output, and $0.075/M tokens for implicit caching — all lower than Qwen3.8-Max» ([X-анонс Qwen](https://x.com/Alibaba_Qwen/status/2122148127520289151)); корроборация прайсом Model Studio и [DataCamp](https://www.datacamp.com/blog/qwen4-max). Заявление «25% below the Qwen 3.8-Max list price» даёт задним числом ≈$2/$6 для 3.8-Max [infer].
- **«Expiry date, not a permanent launch»** — только про preview-эндпоинт `qwen4-max-preview` (11.11 → 25.11.2026 24:00 UTC+8, затем retiring); GA с 16.11 постоянна [confirmed].
- **«−60% стоимости задачи»** — внутренний бенчмарк Work360 (721 спец-область), независимой проверки нет [confirmed как заявление]: «average cost per task drops from $4.43 to $1.67» → арифметически −62%; в PR-тексте «around 60%», в китайском репосте «58%» — разброс формулировок одного источника.
- **AA Intelligence Index 43** [credible, AA — снапшот от 13.11, preview-версия; прямого числа на живой странице AA не перепроверено]: $3.27/задачу, 32.1 мин/задачу; «gaining 9 points over Qwen3.8 Max… and landing 3 points behind» Kimi K3.1 Pro (46). Позиция между якорями: Qwen3.8-Max (~34 [infer]) < 43 < Kimi 46 < фронтиры 50–65. Снапшот AA от 13.11 = preview-версия модели — GA-скор может слегка измениться [credible].
- **Открытые веса**: «Smaller models in the family are coming to open source, built on the same lineage and trained with the same generation of techniques» (блог) — без дат и размеров [confirmed]; Qwen4-27B на 18.11 не released [credible]; слух «не будет 4B/9B/35B MoE» — не подтверждён [rumor]; до-релизный слух «27B+Max одновременно» не сбылся [rumor].
- **Knowledge cutoff** — в доступном корпусе не найден [confirmed-отсутствие].
- **Веса Qwen4-Max** на Hugging Face/ModelScope отсутствуют (закрытый API) [confirmed, 18.11].

---

## 4. Калибровка по открытым моделям известного размера

Спеки якорей (все подтверждены с источниками): Kimi K3.1 Pro 2.8T/104B (93 слоя) [confirmed]; DeepSeek V4 Pro 1.65T/49B [confirmed]; Inkling 975B/41B [confirmed]; Mistral Large 4 1T/52B официально (49B — вторичные, конфликт не разрешён) [credible]; Qwen3.8-Flash-Next 125B/6B + 51B n-gram + 4B MTP [confirmed]; Nemotron 3 Ultra **550B/55B** [confirmed]; gpt-oss-120b 117B/5.1B [confirmed].

Позиции Artificial Analysis Intelligence Index v5.0.1 (снапшот 18.11.2026; Qwen4-Max — 13.11, preview-версия) [confirmed; для строки Qwen4-Max — credible]:

| II | Модель | Класс | Cost/task | Time/task |
|---|---|---|---|---|
| 65 | Claude Fable 5.2 Max | закрыт | $26.54 | 40.9 мин |
| 60 | Gemini 4 Carbon High | закрыт | $5.48 | 31.8 мин |
| 62 | **GPT-6.2 Astra Max** | закрыт | $4.00 | 10.4 мин |
| 57 | GPT-6 Astra Max / **GPT-6.2 Sol Max** | закрыт | $6.24 / $1.01 | 20.2 / 7.9 мин |
| 55 | GPT-6.1 Sol Max | закрыт | $1.27 | 22.7 мин |
| 54 | **Gemini 4 Hydrogen Xhigh** | закрыт | $3.16 | 15.6 мин |
| 50 | Gemini 4 Argon High | закрыт | $4.97 | 29.4 мин |
| 46 | Kimi K3.1 Pro (2.8T-A104B) — лучший открытый | открыт | $3.68 | 38.9 мин |
| 43 | **Qwen4-Max** | закрыт | $3.27 | 32.1 мин |
| 29 | Qwen3.8-Flash-Next (125B-A6B) | открыт | $0.57 | 29.2 мин |
| 23 | DeepSeek V4 Pro (1.65T-A49B) | открыт | $1.77 | 17.3 мин |
| 12 | Nemotron 3 Ultra (550B-A55B) | открыт | $2.21 | 4.3 мин |
| 4 | gpt-oss-120b (117B-A5.1B) | открыт | $0.35 | 6.7 мин |

Калибровочные правила (выводы из таблицы):

1. **Размер не предсказывает reasoning-индекс** — пост-тренинг доминирует: DeepSeek 1.65T-A49B (II 23) хуже Flash-Next 125B-A6B (II 29); Nemotron 550B-A55B (II 12) и gpt-oss (II 4). Оценить закрытую модель «по бенчмарку» = оценить её пост-тренинг, не размер [infer].
2. **Весь закрытый фронтир (II 50–65) стоит выше лучшего открытого (Kimi 46, 104B active)** — по reasoning-индексу открытые якоря дают закрытым только нижнюю границу [infer].
3. **Цена кодирует позиционирование и маржу, не размер**: один класс интеллекта — разброс цен 2–5× между лабораториями (Carbon II 60 за $20 list vs Astra II 57 за $50) [infer].
4. **Китайский прайсинг ~2× дешевле за пункт II**: Qwen4-Max (II 43) за $4.50 output против американского среднего тира (II 50–55) за $7.50–10 [infer]. Оценивать китайскую модель по цене надо с коэффициентом ~2–2.5×.
5. **Считать $/task, а не $/токен**: «дешёвый» токен при жадной генерации дороже на выходе (Kimi $3.68/task II 46 vs Sol $1.01/task II 57) [infer].
6. **Factual-recall ↔ total params** (SimpleQA-тип) — гипотеза правдоподобна (ёмкость хранения), но количественно в этом прогоне не подтверждена; для неё нужны семейства с одинаковым пост-трейном и разным total. N-gram таблицы (Flash-Next 51B, Qwen4-Max 328B) — «дешёвая при инференсе память», они усложняют прямые total-сравнения с классическими MoE [infer].

Как эти правила калибруют наши диапазоны: Astra 6.2 (II 62, $40 output) — уровень «большой активной части»; Sol 6.2 (II 57 при $10) и Hydrogen (II 54 при $7.50) — середина линейки, но II выше лучшего открытого на 8–11 пунктов, что при маленькой активной части означало бы экстремально сильный пост-тренинг [infer, низкое доверие]. Qwen4-Max (II 43, 71B active, $4.50) — единственный закрытый внутри открытого диапазона, и это согласуется с его заявленными числами [infer].

---

## 5. Противоречия и слухи — сводка с оценкой

| # | Противоречие/слух | Оценка |
|---|---|---|
| 1 | Цена Hydrogen: $1.50/$7.50 vs «вдвое дороже» | Разрешено: обе версии верны относительно разных дат (промо 3.8 Flash до 31.12.2026 vs с 01.01.2027) |
| 2 | Carbon AA II 59 vs 60 | Дрейф версии индекса (v5.0 от 30.10 vs v5.0.1); брать 60 |
| 3 | −58% / −60% / −62% cost-per-task Qwen4 | Один PR-семейство; арифметика блога $4.43→$1.67 = −62%; брать 62% с пометкой |
| 4 | Mistral Large 4: 52B (официально) vs 49B (вторично) | Не разрешено, мелочь; брать 52B |
| 5 | DeepSeek V4 Pro: 1.65T vs 1.6T | Варианты подсчёта; порядок устойчив |
| 6 | Релиз GPT-6 Astra Sep 3 vs Sep 4 | Мелочь (анонс vs rollout/таймзона) |
| 7 | «Sol почти догнал Astra на FrontierCode» vs «GPT-6 Astra (44.0%) всё ещё #1» и «coding flat/−3» | Вероятно разные конфиги (max vs прочие); в кодинг-агентах прирост 6.2 минимален — использовать осторожно |
| 8 | LMArena-агрегаторы: Hydrogen 1490 (#7) vs 1631 (#1) | Мусорные агрегаторы, не использовать |
| 9 | Кэш Hydrogen $0.075 vs $0.15 | Не разрешено; влияет слабо |
| 10 | Оценки брифа (3.5T/220B у GPT-6 Astra и др.) | Ни одного публичного подтверждения; непроверяемые внутренние оценки |
| 11 | Слух: «gpt-6.2-betelgeuse», «Bell 10T», rc-ada-* | Внутренние ID/следующее поколение; о размере 6.2 ничего не говорят |
| 12 | Слух: Hydrogen «дистиллирован из GLM 5.3» | Противоречит официальной карточке; отброшен |
| 13 | Слух: Hydrogen «Carbon со скидкой» / «дистилляция из Carbon» | Обе версии совместимы с официальными данными; механизм не разрешён |
| 14 | Слух: открытые Qwen4 «без 4B/9B/35B MoE»; «27B+Max одновременно» | Первый не подтверждён; второй не сбылся (27B не released) |

---

## 6. Метод и ограничения

- Ресерч выполнен 18.11.2026, через 1–6 дней после релизов: независимых замеров скорости мало (AA уже измерил все четыре модели — Astra/Sol 18.11, Hydrogen 12.11, Qwen4-Max 13.11 на preview-версии).
- Reddit недоступен напрямую (капча/blocks) — цитаты сообщества взяты из поисковых сниппетов и помечены [credible]/[rumor] соответственно.
- qwen.ai — SPA; блог прочитан через браузер, часть цифр восстановлена из alt-текста фигур — все ключевые фразы сверены дословно.
- Launch-пост OpenAI дважды отдавал 500 через прямой fetch, прочитан через браузер целиком.
- Все параметры-«оценки» (total/active/слои/эксперты) для GPT-6.2 и Hydrogen — честные диапазоны [infer] с низким доверием; хорошо аргументированный диапазон предпочтительнее ложной точности.

### Материалы (сырьё ресерча)

Промежуточные отчёты по 7 направлениям и сводка сверки: `research/2026-11-closed-models/` (map.md, dive_01…dive_07.md, verify.md).
