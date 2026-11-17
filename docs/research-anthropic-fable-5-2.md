# Claude Fable 5.2 и Claude Mythos 5.2: масштаб и архитектура

*Исследование выполнено 10 ноября 2026, через сутки после анонса (9 ноября 2026, [лонч-пост Anthropic](https://www.anthropic.com/claude-fable-and-mythos-5-2)). Метод: ~80 независимых поисков по 8 направлениям с перекрёстной проверкой; каждый факт помечен **confirmed** (официальный первоисточник), **credible report** (именованный СМИ/аналитик) или **my inference** (наша инференция). Anthropic не публикует ни одного архитектурного числа — почти все цифры ниже честно являются инференцией, и для каждой дан диапазон, а не «точность».*

---

## TL;DR

1. **Вердикт: Fable 5.2 — почти наверняка не новый претрейн, а дальнейший пост-трейн на той же базе Mythos-класса, что и Fable 5.1** (корпус с окном данных по июнь 2026). Уверенность умеренная: **~70% (диапазон 60–75%)**. Аргумент: идентичный июньский cutoff 5.1 и 5.2, шаблонная формулировка карточек, сорванный (по Reuters) октябрьский запуск *следующего* поколения, экономика point-release.
2. **Масштаб: ~8T суммарных параметров (честный диапазон 5–12T), MoE, ~250–300B активных на токен** — всё с низкой уверенностью (инференция), но это лучшие защищаемые значения из имеющихся данных.
3. **−20% цена и +30% скорость — это эффективность сёрвинга, а не уменьшение модели**: fast mode официально «the same model with a faster inference configuration», и он существует с мая 2026 как платформенная опция.
4. **Маркетинговое «быстрее и дешевле» верно только за токен**: за задачу на Max effort 5.2 дороже 5.1 примерно вдвое ($26.54 vs $12.99, AA) из-за 1.7× токенов; два независимых измерителя (Artificial Analysis и SemiAnalysis GDPx) сходятся в «token hungry на высоких усилиях».

---

## 1. Вердикт: новый претрейн или пост-трейн Fable 5.1?

**Fable 5.2 построена на претрейн-базе с корпусом по июнь 2026 — той же, на которой стоит Fable 5.1. Вердикт: «пост-трейн (point release)», вероятность ~70% (60–75%).**

Доказательная цепочка (по убыванию веса):

1. **Идентичный knowledge cutoff — главный структурный факт. [confirmed]** Официальный [справочный центр Anthropic](https://support.claude.com/en/articles/8114494-how-up-to-date-is-claude-s-training-data) фиксирует каскад: Fable 5 — январь 2026; **Fable 5.1, Fable 5.2 и вся линейка 5.5 — июнь 2026**. Системные карточки подтверждают дословно: 5.1 — *"The knowledge cutoff date for Fable 5.1 and Mythos 5.1 is June 2026"* ([карточка 5.1](https://www-cdn.anthropic.com/0339e6a7c5c7b87f5c07798616dc32c215d14235/Claude%20Fable%205.1%20&%20Claude%20Mythos%205.1%20System%20Card.pdf)), 5.2 — *"The knowledge cutoff for Claude Fable 5.2 and Claude Mythos 5.2 is June 2026"* ([карточка 5.2](https://assets.claude.com/27d60918d218125e7504bc7354c4b4626ec56b11.pdf)). *My inference:* если бы 5.2 была свежим претрейном, завершённым к релизу 9 ноября, по образцу 5.1 (релиз 1 сентября при июньском cutoff ≈ 3-месячный лаг) ожидался бы cutoff август–сентябрь 2026. Одинаково «замороженный» июньский cutoff во всей линейке указывает на один корпус и последовательные пост-трейны поверх одной базы.
2. **Формулировка «a new large language model» — не дискриминатор. [confirmed]** Она дословно стоит не только в карточке 5.2, но и в карточке point-release 5.1: *"two configurations of a new large language model from Anthropic, sharing identical model weights"*, а также в карточках «минорных» [Opus 5.5](https://www-cdn.anthropic.com/fc1b44717c85dc068bc6ba5024219938094694bd/Claude%20Opus%205.5%20System%20Card.pdf) и Sonnet 5.5, Mythos Preview и Fable 5. Гипотеза «карточка говорит NEW ⇒ свежий претрейн» снята прямой сверкой пяти карточек.
3. **Свежий претрейн был и остался отдельной, невышедшей моделью. [credible report]** [Reuters по IPO-файлингу Anthropic (26–27.10.2026)](https://www.reuters.com/legal/litigation/anthropic-discloses-month-long-training-pause-ai-security-breaches-ipo-filing-2026-10-26): *"Anthropic paused training of its next-generation flagship AI model for more than a month over security concerns"*. При этом карточка 5.2 цитирует *"an unreleased model that is somewhat more capable than Claude Mythos 5.2"* [confirmed] — то есть «следующее поколение» существует и не выпущено. *My inference:* сорванный октябрьский прогон — это оно, а не 5.2.
4. **Экономика релиза — паттерн point-release. [confirmed + credible report]** −20% цена на всех категориях (включая кэш: $0.25→$0.20), +30% скорость, [fast mode](https://platform.claude.com/docs/en/build-with-claude/fast-mode) — опция платформы, работающая с Opus 4.8 ещё с мая 2026: *"Fast mode runs the same model with a faster inference configuration. There is no change to intelligence or capabilities"*. [SemiAnalysis](https://latent.space/p/ainews-fable-5-2-retakes-world-1-llm-spot-as-ant-ipo-roadshow-begins): *"It's a marginal improvement, incomparable to the original Mythos release"*; аналитик Alan D. Thompson ([LifeArchitect](https://lifearchitect.substack.com/p/the-memo-special-edition-claude-fable-24d)): *"Fable 5.2 is a point release on the same Mythos-class base as Fable 5.1"*.
5. **Против вердикта (что оставляет 25–35%):** официальных заявлений о преемственности базы нет — 10 поисков по высказываниям сотрудников дали пустой результат; скачок способностей велик для point-release (RoboDojo 27.6→64.9%, [Chartography no-tools 44.8→73.4%](https://assets.claude.com/27d60918d218125e7504bc7354c4b4626ec56b11.pdf), SWE-bench Pro 81.2→93.0%); страница docs 5.2 не использует «extends»-язык 5.1. Не исключён «продолженный претрейн на замороженном корпусе» — он внешне неотличим от чистого пост-трейна.

**Что сняло бы неопределённость:** техотчёт с архитектурой, официальное расшифрование METR-моделей «Model 3/4» в термины продуктов, любое named-заявление сотрудника Anthropic.

---

## 2. Сводная таблица оценок

### Fable 5.2 / Mythos 5.2 (одна модель, две конфигурации safeguards)

| Параметр | Оценка (центр / диапазон) | Уверенность | Статус | Ключевое доказательство |
|---|---|---|---|---|
| Суммарные параметры | **~8T** / 5–12T | низкая | **my inference** | FT-reported ~8T для Mythos 5 ([Reuters](https://www.reuters.com/technology/bytedance-targets-mega-ai-model-nearing-anthropics-mythos-ft-reports-2026-08-07)); Thompson ~10T; compute-граница допускает до ~12–15T |
| Плотность | **MoE** (sparse) | низкая-средняя | **my inference** | экономика dense 7–10T не сходится ни по инференсу, ни по обучению; все сверстники-флагманы 2026 — MoE |
| Активные параметры | **~250–300B** / 150–450B | низкая | **my inference** | активная доля 3–5% у всех открытых MoE-сверстников 2026; Thompson ~150B (1.5%) — аномально ниже всех |
| Слои | **~108** / 96–120 | низкая | **my inference** | у сверстников 61–93 слоя при ≤2.8T; прецедент 120 — слух о GPT-4; latency «Moderate» |
| Эксперты (routed) | **~512** / 384–640 + 1–2 shared | низкая | **my inference** | гранулярность 33–110M/эксперта у peer; 8T/108L/512E ≈ 140M/эксперта |
| top-k | **~12** / 10–14 | низкая | **my inference** | k/E 1.56–3.1% у peer; активная доля ≈ 1.6–2.1× k/E |
| Компоненты вне основных слоёв | vision-путь (патчи 28×28 px = visual token); новый токенизатор (~+30% токенов на текст); adaptive thinking (всегда вкл.) + effort; стек классификаторов с фоллбэками; вероятно draft-head/FP8-FP4 сёрвинг | смешанная | **confirmed** (контракты) / **my inference** (энкодер, draft) | [docs](https://platform.claude.com/docs/en/models/fable-5-2/overview), [vision pricing](https://platform.claude.com/docs/en/about-claude/pricing), [карточка](https://assets.claude.com/27d60918d218125e7504bc7354c4b4626ec56b11.pdf) |
| Контекстное окно | **1M вход / 128K выход** (1M — default и maximum, без надбавок) | высокая | **confirmed** | [docs](https://platform.claude.com/docs/en/models/fable-5-2/overview), [Bedrock card](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-fable-5-2.html) |
| Модальности | **текст + изображения → текст**; аудио/видео-входа нет | высокая | **confirmed** | docs + Bedrock card: *"The model outputs text only."* |
| Knowledge cutoff | **июнь 2026** | высокая | **confirmed** | карточка + [справочный центр](https://support.claude.com/en/articles/8114494-how-up-to-date-is-claude-s-training-data) |
| Цена | **$8 / $40** за 1M in/out; кэш-хит $0.20 | высокая | **confirmed** | лонч-пост, [pricing docs](https://platform.claude.com/docs/en/about-claude/pricing) |
| Fast mode | **$16 / $80**, «up to 2.5×»; та же модель, другой сёрвинг; измерено 2.18–2.54× | высокая | **confirmed** | [fast-mode docs](https://platform.claude.com/docs/en/build-with-claude/fast-mode), [OpenRouter](https://openrouter.ai/anthropic/claude-fable-5.2) |
| Скорость стандартного тира | +30% к 5.1 (заявка); OpenRouter P50 ~77–82 tok/s | средняя | **confirmed** (заявка) / **credible report** (замеры) | лонч-пост; OpenRouter; прямого apples-to-apples замера 5.2 vs 5.1 ещё нет |

### Fable 5.1 (скорректированная строка — та же база, поэтому совпадает с 5.2)

| Параметр | Было в нашем prior | Скорректировано | Комментарий |
|---|---|---|---|
| Total | ~7T (4–10T) | **~7–8T (5–12T)** | FT-reported 8T для Mythos-класса добавляет веса верхней стороне |
| Active | ~320B | **250–350B** (320B остаётся в коридоре) | Thompson ~150B бьётся с ratio-prior'ом всех открытых MoE |
| Слои | 120 | **96–120, точка ~108** | 120 не подтверждается ничем; peer-практика 61–93 при ≤2.8T |
| Эксперты | 384 (top-18) | **384–640, точка 512; top-k 10–14 (точка 12)** | top-18 при 384E даёт активную долю 7.5–9.9% с накладными — выше каждого из пяти сверстников |
| Остальное | — | без изменений | 1M/128K, cutoff Jun 2026, $10/$50 — подтверждено |

---

## 3. Число за числом

### 3.1. Суммарные параметры: ~8T (5–12T) — my inference
Три независимые линии оценок кластеризуются в 7–10T: [FT по сообщению Reuters](https://www.reuters.com/technology/bytedance-targets-mega-ai-model-nearing-anthropics-mythos-ft-reports-2026-08-07) — *"industry estimates say Anthropic's most advanced Mythos 5 has about 8 trillion parameters and Fable 5 about 5 trillion"* **[credible report]**; [Thompson](https://lifearchitect.substack.com/p/the-memo-special-edition-claude-fable-24d) — ~10T **[credible report]**; наш prior 7T **[my inference]**. Центр 8T — консенсус этого кластера. Нижний край 5T — цифра FT для Fable 5 (возможная интерпретация «меньшей публичной конфигурации», но она конфликтует с «same underlying model» — см. противоречие П4); верхний край 12T ограничен compute-бюджетом флота 2026 г. (**my inference**).

### 3.2. Dense или MoE: MoE — my inference (уверенность низкая-средняя)
Инференс dense-модели на 7–10T стоит ~1.4×10¹³ FLOP/токен — при цене $8/MTok это не сходится с любой известной экономикой 2026 года; обучение dense 7T на ~250T токенов потребовало бы ~3×10²⁷ FLOPs — на два порядка выше калиброванных оценок прогонов Anthropic. Все пять открытых флагманов 2026 (Kimi K3.1 Pro, Qwen3.8 Max, DeepSeek V4 Pro, Inkling, Mistral Large 4) — MoE. Подтверждений dense-гипотезы не найдено, но и MoE официально не подтверждено — статус именно инференции.

### 3.3. Активные параметры: ~250–300B (150–450B) — my inference
У всех известных крупных MoE активная доля 3.0–5.2% (DeepSeek V4 Pro 3.0%, Kimi K3.1 Pro 3.7%, Qwen3.8 Max 4.0%, Inkling 4.2%, Mistral Large 4 5.2%) — на 8T это даёт 240–400B, что поддерживает наш прежний ~320B сильнее, чем Thompson ~150B **[credible report о самом факте оценки]**. Thompson'овские 150B на 10T (1.5%) ниже практики всех сверстников и потребовали бы рекордно грубой маршрутизации. Compute-проверка не различает 150B и 320B: при FLOP ≈ 6·N_active·D и C≈2–5×10²⁶ оба значения совместимы при разном числе токенов обучения (~250T vs ~150T) — спор об active фактически является спором о токенах (**my inference**, [подробный расчёт](https://metr.org/blog/2026-11-05-anthropic-ai-rd-acceleration-assessment) в досье compute).

### 3.4. Слои: ~108 (96–120) — my inference
У открытых сверстников 2026 при масштабе ≤2.8T — 61–93 слоя ([DeepSeek V4 Pro: 61](https://huggingface.co/Jun134340/DeepSeek-V4-Pro/blob/main/config.json), [Qwen3.8: 92](https://huggingface.co/Qwen/Qwen3.8-2.4T-A95B/raw/main/config.json), Kimi K3: 93, Mistral Large 4: 72). Прецедент 120 слоёв — слух о GPT-4 (2023). Comparative latency «Moderate» в docs — аргумент против >128. Наша точка ~108 — компромисс; при same-base конфигурация 5.2 не отличается от 5.1.

### 3.5. Эксперты и top-k: ~512 routed, top-12 (+1–2 shared) — my inference
Ключевая регулярность peer-набора: активная доля ≈ **1.6–2.1 × k/E** (накладные: внимание + shared + dense + эмбеддинги). Проверка на Kimi: routed-only ≈ 16×33M×93 ≈ 49B из 104B заявленных → накладные ~55B. Отсюда: пара «384E + top-18» из старого prior дала бы активную долю 7.5–9.9% — выше каждого из пяти сверстников (максимум 5.2% у Mistral); ремонт без правки total — top-10–14. Shared-эксперты (1–2 на слой) — универсальная практика всех пяти peer.

### 3.6. Компоненты вне основных слоёв — confirmed контракты, my inference устройство
- **Vision-путь [confirmed]**: изображения квантизуются патчами *"Each patch is a 28×28-pixel block of the image, referred to as a visual token"* ([vision docs](https://platform.claude.com/docs/en/build-with-claude/vision)); до 600 изображений на запрос, 8000×8000 px. Наличие отдельного ViT-подобного энкодера — **my inference**: в системной карточке «vision encoder» не встречается ни разу (grep полного текста, 0 вхождений) — отсутствие раскрытия ≠ отсутствие компонента.
- **Новый токенизатор [confirmed]**: *"Claude 4.7 and later models… use a newer tokenizer that contributes to their improved performance… This tokenizer produces approximately 30% more tokens for the same text"* ([pricing](https://platform.claude.com/docs/en/about-claude/pricing)). Внутри линейки 5.x токенизатор общий, так что сравнение 5.2↔5.1 корректно; межсемейные сравнения цен требуют нормировки.
- **Adaptive thinking + effort [confirmed]**: *"Adaptive thinking is always on and can't be turned off. Control thinking depth with the effort parameter"*; усилия low/medium/high/xhigh/max, default `high`.
- **Стек safeguards с фоллбэками [confirmed]**: кибер-блокировки → Opus 4.8, biology/RSI → Opus 5; ограничение AI-R&D-способностей внесено в обучение, не в сёрвинг.
- **Сервинг fast mode [confirmed опция / my inference механика]**: вероятно FP8/FP4-чекпоинты + draft-head (спекулятивный декодинг) — стандарт peer-стека 2026 (MTP у DeepSeek/Qwen, DSpark у Mistral), но не раскрыто.

### 3.7. Контекст и модальности — confirmed
1M вход / 128K выход, вход «текст и изображения», выход только текст; без аудио/видео (Bedrock-таблица модальностей: Audio/Speech/Video — not-supported). 1M — default и maximum без бета-флагов, надбавки за длинный контекст нет: *"a 900k-token request is billed at the same per-token rate as a 9k-token request"*. Значения не менялись с Fable 5.

### 3.8. Скорость и fast mode — confirmed
Заявка «up to 30% faster» — per-token **[confirmed как заявка; независимого apples-to-apples замера 5.2 vs 5.1 пока нет]**. Косвенно: 5.2 на OpenRouter ~77–82 tok/s против 47 tok/s у Fable 5 на той же платформе в октябре. Fast mode: [OpenRouter](https://openrouter.ai/anthropic/claude-fable-5.2) измеряет 179 tok/s (P50) на «Anthropic Fast» против 77–82 у стандартного тира — **фактически подтверждённые 2.2–2.5×**. Существование платного premium-тира — аргумент против гипотезы «5.2 — маленькая модель»: маленькой модели не нужен тир скорости за 2× цену.

---

## 4. Экономика: что значат −20% цены, +30% скорости и fast mode 2.5×

**Основное чтение: та же (большая) модель на улучшенном сёрвинг-стеке, маржа за счёт эффективности — не уменьшение модели.** Доказательства:
- Официальная механика fast mode: *"Fast mode runs the same model with a faster inference configuration. There is no change to intelligence or capabilities"*, фокус на OTPS, не TTFT **[confirmed]**. Опция существует с [Opus 4.8](https://www.anthropic.com/news/claude-opus-4-8) (28.05.2026) — это переиспользуемая инфраструктура, а не спец-артефакт 5.2.
- [SemiAnalysis](https://newsletter.semianalysis.com/p/ai-value-capture-the-shift-to-model): *"Anthropic's margin expansion so far has come from cost reductions; they can generate the same tokens for cheaper"*, gross margin mid-60% **[credible report]**.
- Пропорциональное снижение всех цен (включая кэш-хит 2.5% от входа: $0.25→$0.20) — паттерн удешевления обслуживания, а не репозиционирования продукта.
- Контраргумент учтён: −20% может быть и конкурентным ходом (GPT-6 Astra $10/$50), но одновременность трёх факторов (цена ↓, скорость ↑, токены на задачу ↓ при том же усилии) согласуется с реальным удешевлением сёрвинга.
- Каверка: номинальное сравнение с другими семействами портит новый токенизатор (+30% токенов на тот же текст) — эффективная цена входа выше списка $8/MTok.

**Fast mode — не сигнал о размере.** При 2.5× OTPS и 2× цене стоимость задачи в долларах не меняется — премия покупает wall-clock; маржинальность обеспечивается меньшим батчем/большим числом чипов на запрос и/или спекулятивным декодингом (механика не раскрыта; гипотеза комьюнити «Haiku-draft» неподтверждена — **my inference, низкая уверенность**).

**Per-token vs per-task — главное метрическое противоречие релиза.** [AA через R&D World](https://www.rdworldonline.com/anthropic-says-fable-5-2-nearly-doubles-its-predecessors-hardware-design-score-token-prices-fell-20-but-the-cost-per-task-doubled-at-full-effort): *"Fable 5.2 used about 1.7 times as many output tokens as its predecessor… $26.54 per Intelligence Index task for Fable 5.2 at Max, compared with $12.99 for Fable 5.1"*. [SemiAnalysis GDPx](https://latent.space/p/ainews-fable-5-2-retakes-world-1-llm-spot-as-ant-ipo-roadshow-begins): *"Cost per task rose 31% ($67.16 → $88.15) despite the 20% cheaper per-token price"*. При этом на Medium effort токенов на задачу действительно меньше (заявка Anthropic, подтверждается AA на High: те же 62 балла II за $9.08 против $14.83 на Xhigh). Интерпретация: на Max модель «думает» глубже и верифицирует шире (сотни тест-кейсов против ~20 у предшественников) — это качество, а не неэффективность, но нарратив «быстрее и дешевле» на уровне задач не подтверждается.

---

## 5. Компьют и инфраструктура

- **Флот на момент претрейна базы (~Q2 2026): ~1.4–2.5 GW.** Rainier: ~500 тыс. Trainium2 (июнь 2025) → >1 млн чипов к концу 2025 при общей ёмкости 1.4 GW **[credible report]**; [сделка с AWS 20.04.2026](https://www.anthropic.com/news/anthropic-amazon-compute) — "up to 5 gigawatts" / >$100 млрд, но новые кампусы дают мощность в 2027–2028 **[confirmed]**. TPU-сделка: *"up to 1 million TPUs… well over a gigawatt of capacity online in 2026"* [confirmed]. Полный конвейер Anthropic — [>15 GW по 15 кампусам](https://measuredai.substack.com/p/anthropic-data-centers) **[credible report]**.
- **[METR (05.11.2026)](https://metr.org/blog/2026-11-05-anthropic-ai-rd-acceleration-assessment)**: *"We are confident that the acceleration was not due to an acceleration in the scaling of training compute"* **[confirmed]** — ускорение от пост-трейна/RL и методов, не от большего прогона. Внутренние Model 3 (финиш авг–сен 2026) и Model 4 (сен–окт 2026) сильнее релизной 5.2 и остаются внутренними.
- **Оценка тренинг-FLOP: ~2–5×10²⁶ (калиброванный диапазон 1×10²⁶–2×10²⁷; фактор 3–5) — my inference.** Перекрёстные проверки: implied Thompson (6×150B×250T = 2.25×10²⁶) — середина диапазона; implied prior (320B×250T = 4.8×10²⁶) — верх середины; рост от GPT-5 (5×10²⁵) — исторический тренд 4–5×/год «без ускорения» по METR. В карточке 5.2 нет ни одного compute-раскрытия (grep: Trainium/TPU/gigawatt — 0 вхождений), ASL-нумерация отсутствует (только пороги RSP: A-2 не пересечён, CB-1, FCF «lower category»).
- **Следствие для параметров (my inference):** compute-optimal dense при таком бюджете — лишь ~1.3–2T параметров; Mythos-класс — сильно перетренированная MoE (inference-оптимизация). Compute не выбирает между 150B и 320B активных — нужен конфиг или длительность тренировки.

---

## 6. Сравнение с открытыми моделями известного размера

| Модель | Total–Active | AA II v5 | Epoch ECI | Комментарий |
|---|---|---|---|---|
| **Claude Fable 5.2** | ~8T–~280B (инференция) | **65 (№1)** | **174 [170–179] (№1 из 239)** | [AA](https://artificialanalysis.ai/models), [Epoch](https://epoch.ai/models/claude-fable-5-2): *"sets a new record… The previous high was GPT-6 Astra's 169"* |
| Claude Opus 5.5 | ~4.8T–~135B (инференция) | 59.1 | 169 [166–172] | «daily driver» по классификации Anthropic |
| GPT-6 Astra | н/д | 56.9 | ~169 (по анонсу Epoch) | прошлый рекордсмен ECI |
| Claude Fable 5.1 | ~7–8T–~300B (инференция) | 49.2 | 167 [164–170] | та же база, меньший пост-трейн |
| DeepSeek V4 Pro | 1.65T–A49B | 53.2 | н/д | лучшая открытая: дожимает потолок эффективности |
| Kimi K3.1 Pro | 2.8T–A104B | 46.5 | н/д | активных 104B при 2.8T (NVIDIA NIM) |
| Qwen3.8 Max | 2.4T–A95B | 33.6* | н/д | *preview-конфиг |
| Mistral Large 4 | ~1T–A52B | 26.1 | н/д | плотный peer-набор для ratio-prior |
| Inkling | 975B–A41B | 30.6 (Small) | н/д | Thinking Machines |

Отсюда — главный калибровочный аргумент по размеру: Fable 5.2 обгоняет DeepSeek V4 Pro (1.65T-A49B) на ~12 п.п. AA II; при сопоставимой эффективности данных это исключает total заметно ниже ~2–3T (**my inference, мягкий floor**), а отрыв от Kimi (2.8T-A104B, 46.5) консистентен с флагманом в диапазоне 5–10T total / 200–400B active. Точных значений SimpleQA для 5.2 в открытых источниках не найдено; SimpleQA-«насыщение» в комьюнити объясняется отказами отвечать, а не знаниями.

---

## 7. Противоречия между источниками

1. **«New large language model» vs «point release».** Карточка 5.2: *"two configurations of a new large language model"*; Thompson: *"a point release on the same Mythos-class base"*. — **Разрешено**: та же формула стоит в карточках point-release 5.1 и «минорных» Opus/Sonnet 5.5 — это шаблон, не дискриминатор. Остаточный нюанс: Exec Summary 5.1 использовал мягкое *"our latest and most capable large language model"*, 5.2 — «new»; стилистическое расхождение при минимальном весе.
2. **«Быстрее и дешевле» vs стоимость задачи.** Лонч-пост: −20% цена, +30% скорость; SemiAnalysis GDPx: +31% cost/task; AA: ×2 cost/task на Max при 1.7× токенов. — **Метрическая развилка, не ложь**: per-token правда; per-task хуже из-за более глубокого мышления на высоких усилиях. Оба измерителя независимы и сходятся.
3. **Параметры: Thompson 10T/150B vs prior 7T/320B vs peer-практика 3–5% active.** — **Частично разрешено**: ratio-prior бьёт 150B (1.5% — аномалия против 5/5 сверстников); total остаётся развилкой 7–10T; compute совместим с обоими active при разном числе токенов.
4. **FT: Mythos 5 ≈ 8T vs Fable 5 ≈ 5T при «same underlying model».** — **Не разрешено.** [Разбор local-ai-zone](https://local-ai-zone.github.io/blog/Claude_Mythos_5.1_Technical_Analysis.html): *"Both cannot be literally true"*; три чтения: устаревшие/ошибочные оценки; конфляция с Mythos Preview (~10T по не-FT источникам); «same model» в смысле lineage, а не байт-идентичных весов. Anthropic молчит.
5. **Vision: +28.6 п.п. no-tools vs +3.2 п.п. with-tools на Chartography.** — **Зафиксировано как harness-эффект**: с инструментами модели сближаются (91.6 vs 88.4 vs 89.0); кроме того, грейдер карточки сменён на Gemini 3.5 Flash — сравнения со старыми карточками некорректны.
6. **OSWorld 2.1: 89.3 vs 54.6%.** — **Разрешено**: разные метрики (partial credit в карточке vs строгое полное завершение у VentureBeat).
7. **Графики FLT «36% vs 86% за 18ч» в лонч-треде.** — **Разрешено первоисточником** (§8.12.3 карточки): 0.35 — команда из 100 агентов (среднее 3 прогонов), 0.86 — команда из 1000 агентов (одиночный запуск, earlier snapshot), 1.0 к 30-му часу; Opus 5.5 — 0.26.
8. **ECI: компиляция «Opus 5.5 = 169» vs анонс Epoch «previous high was GPT-6 Astra's 169».** — **Не разрешено (минор)**: вероятно, разные пресеты индекса или именование; проверять по CSV Epoch.
9. **Fast mode: compatibility-страница docs перечисляет только Opus 4.8/5/5.5, pricing-страница уже продаёт fast mode для 5.2.** — **Разрешено**: лаг кэша docs; приоритет pricing-странице. На Bedrock fast mode для 5.2 не заявлен.
10. **Абсолютные tok/s: OpenRouter 77–82 vs AA 44.1.** — **Разрешено**: разный workload (живой агентский трафик vs Max с длинным thinking, TTFT ~232 c). Смешивать нельзя.
11. **Bloomberg: «>$895B будущих расходов» vs сумма публичных сделок ~$300B+.** — **Не разрешено**; вероятно, включает будущие обязательства и проектное финансирование провайдеров.
12. **SEO-страницы с финальными ценами $8/$40, датированные 5–10 сентября.** — **Разрешено как data-hygiene**: ретро-обновление SEO, не утечка; весь «предрелизный» SEO-корпус по 5.2 читать с подозрением.

---

## 8. Слухи и их оценка

| # | Слух | Источник/дата | Оценка | Обоснование |
|---|---|---|---|---|
| R1 | «Новая, более способная версия Mythos вышла из тренинга, возможно останется внутренней» | [@kimmonismus / @AndrewCurran_, июнь 2026](https://x.com/kimmonismus/status/2068754830110212411) | **likely** | Ретроспективно подтверждено: карточка 5.2 («самая способная модель остаётся внутренней») + METR Model 3/4 |
| R2 | «Завершён новый претрейн-цикл, notable leap forward» | @kimmonismus, 05.09.2026 | **unlikely** (в сильной форме) | Релиз состоялся 09.11, но как point release с тем же cutoff; «новый претрейн» не подтверждён ни одним пост-релизным разбором |
| R3 | «Релиз very soon» (окно до ~09.09) | @kimmonismus, 05.09.2026 | **unlikely** | Окно прошло пусто; релиз на 2 месяца позже |
| R4 | Окно «late September or early October» | @kimmonismus, 08.09.2026 (пересказ [Pasquale Pillitteri](https://pasqualepillitteri.it/en/news/15205/claude-fable-5-2-leak-new-pretrain-october)) | **unlikely** | Оба срока missed; вместо Fable вышли Opus 5.5 (22.09) и Sonnet 5.5 (28.09) |
| R5 | Преемник выйдет до IPO (конец сентября) | @kimmonismus, ~конец сентября | **unlikely** | Релиз 09.11 — одновременно со стартом роудшоу $ANT IPO |
| R6 | Релиз до конца 2026 (Polymarket 86%) | Рынки прогнозов, 08.09.2026 | **likely** | Сбылось; рынок точнее утечки по датам |
| R7 | Скрытая маршрутизация claude.ai на «Fable 5.5» | JAZII/Chetaslua/Tak, 18.09–02.10 | **unlikely** | Ноль проверяемых идентификаторов; страница docs fable-5-5 пуста; продукт назван 5.2 |
| R8 | «Fable 5.5 появился в каталоге Azure 13.10» | Единственный источник без скриншота | **unverifiable** | Имя не совпало с релизом: плейсхолдер, смена имени или ошибка каталога |
| R9 | Точные цены известны до анонса | kie.ai (05.09), cellcog (10.09) | **unlikely** (как утечка) | Ретро-обновление SEO; даты противоречат релизу |
| R10 | Предрелизные цифры 5.2 (DRB II, High: 57.7%) | [kingy.ai](https://kingy.ai/blog/claude-fable-5-5), 20.10.2026 | **plausible** | Конкретные числа, согласуются с программой внешнего претестирования (UK AISI, Frontier Design, METR) |
| R11 | «Fable Moment 2.0 — эффект нового претрейна» | @teortaxesTex, 10.11.2026 | **unverifiable** | Впечатление без архитектурных данных; противоречит читке point release |
| R12 | Внутренние модели ~175–180 ECI | @scaling01, 10.11.2026 | **unverifiable** | Экстраполяция аналитика (сам помечает как inference); релизная 5.2 — 174 |
| R13 | «Nerfed» относительно внутреннего варианта | Сообщество X/Reddit, 10.11.2026 | **plausible** | Официально подтверждён сам факт тренировочных ограничений AI-R&D-способностей; величина нерфа не раскрыта |
| R14 | «5.2 = Opus 5.5, ничего нового» | Reddit, 10.11.2026 | **unlikely** (в сильной форме) | AA II 65 vs 59; ECI 174 vs 169; субъективное сходство не выдерживает измерений |

**Общий итог по слухам:** утечки корректно предсказали *факт и направление* (новый релиз в Q4) и даже — задним числом — существование сильной внутренней модели (R1), но ошиблись в *механике и сроках* (не «very soon», не новый претрейн, не «5.5»). Диагностический признак надёжного слуха — проверяемый артефакт (идентификатор в каталоге, страница docs, скриншот); у всех сентябрьско-октябрьских архитектурных слухов его не было.

---

## 9. Методология, ограничения, что проверять дальше

**Как считалось:** 8 направлений (верdict база/пост-трейн; параметры; экономика сёрвинга; архитектура; компоненты/модальности; компьют; слухи; точечная дозвонка по FT/ECI/графикам FLT), суммарно ~80+ поисков и 30+ открытых первичных страниц; ключевые PDF (обе системные карточки) прогрепаны полнотекстово; конфигурации MoE-сверстников взяты из config.json официальных репозиториев весов, где возможно.

**Главные ограничения:** (1) ни одного первичного числа о размере — вся параметрика является триангуляцией; (2) The Information осталась за paywall — её предрелизные материалы не вошли ни в одном независимом пересказе; (3) FT-оценка проверена через 8+ синдикаций (Reuters вербатим), но не через оригинал; (4) verdict «пост-трейн» нефальсифицируем без техотчёта — это вероятность, а не факт.

**Что закроет остаточные вопросы:** скачивание CSV Epoch (точные ECI всех моделей и пресеты); открытие оригинала FT; публикация техотчёта или конфига; официальное расшифрование «Model 3/4»; проверка, появится ли fast mode на Bedrock; сравнение скорости 5.2 vs 5.1 на одинаковой методике AA.

*Материалы исследования (8 досье, таблица верификации, выводы): `research/claude-fable-5-2-20261110-1519/`.*
