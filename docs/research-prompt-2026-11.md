# Промпт для глубокого исследования: GPT-6.2 Astra и Sol, Gemini 4 Hydrogen, Qwen4-Max

Для Gemini Deep Research или другого агента-исследователя. Ответ — на русском, с таблицей и ссылками.
Результат положить в `docs/research-2026-11.md`. Если удобнее, можно гнать по одной модели: разделы ниже независимы.

---

Research task: estimate the scale and architecture of four closed models released in November 2026, and decide for each whether it is a new pretrain or a post-trained / adapted version of an earlier model. Answer in Russian.

None of these companies publishes parameter counts. Expect most numbers to be inferences, and be explicit about that. I need a sensible scale estimate to compare with open models of known size, not false precision.

## Open models of known size, for comparison

Kimi K3.1 Pro 2.8T-A104B, DeepSeek V4 Pro 1.65T-A49B, Inkling 975B-A41B, Mistral Large 4 ~1T-A52B, Qwen3.8 Flash Next 125B, Nemotron 3 Ultra, gpt-oss-120b 117B-A5.1B.

## 1. OpenAI GPT-6.2 Astra and GPT-6.2 Sol

Released November 17, 2026 (https://community.openai.com/t/gpt-6-2-astra-and-sol-are-now-available/1417531, full post: https://openai.com/index/introducing-gpt-6-2-astra-sol/).

Known:
- Astra: $8 / $40 per million input / output tokens, 20% below GPT-6 Astra; cached input $0.40 (was $1.00). "Less than a third of the cost per task of GPT-6 Astra".
- Sol: $2 / $10, same as GPT-6.1 Sol. Nearly matches Astra on FrontierCode 2.0 at about one fifth of the cost.
- Ultrafast mode for both.

Our current estimates (all low confidence):

| Model         | Total  | Active | Layers | Experts (top-k) |
| ------------- | ------ | ------ | ------ | --------------- |
| GPT-6 Astra   | ~3.5T  | ~220B  | 112    | 192 (11)        |
| GPT-6.1 Sol   | ~1.25T | ~72B   | 88     | 160 (8)         |
| GPT-6.1 Terra | ~480B  | ~28B   | 64     | 128 (6)         |
| GPT-6 Luna    | ~145B  | ~8B    | 40     | 128 (4)         |

Questions:
- Is GPT-6.2 Astra a new pretrain or post-training of GPT-6 Astra? Same for Sol vs GPT-6.1 Sol. Look at the system card, knowledge cutoffs of 6, 6.1 and 6.2, wording about training.
- What does the 20% price cut on Astra with flat price on Sol imply about size?
- Context window, input and output modalities, knowledge cutoff (API docs, model pages).

## 2. Google Gemini 4 Hydrogen

Released November 12, 2026, replaces Gemini 3.8 Flash. Model card: https://deepmind.google/models/model-cards/gemini-4-hydrogen/

Known from the card: "Gemini 4 Hydrogen is adapted from Gemini 4 Carbon"; 1M context, up to 64K default output; input text, images, audio, video; knowledge cutoff March 2026; four thinking levels. Reported ~2.5× faster than 3.8 Flash. API price is disputed in press: $1.50 / $7.50 (same as 3.8 Flash) or double.

Our current estimates: Gemini 4 Argon and Carbon ~2.3T / ~122B active, 120 layers, 384 experts top-16 (Carbon is post-trained Argon). Gemini 3.8 Flash ~346B / ~22B active, 80 layers, 256 experts top-8.

Questions:
- What does "adapted from Carbon" mean here: distillation into a smaller model, pruning, the same weights with a different serving setup? Find Google's own wording elsewhere (blog, developer docs, staff posts). A Flash-level price strongly suggests a smaller model; check that.
- Total and active parameters, layers, experts, if it is a separate smaller model.
- Confirm the real API price from Google's pricing page.

## 3. Alibaba Qwen4-Max

Released November 16, 2026 via API (https://qwen.ai/blog?id=qwen4-max, https://x.com/Alibaba_Qwen/status/2122148127520289151). "New MoE architecture with native vision and a 1M-token context window". $1.5 / $4.5 per million tokens. Weights not published; smaller Qwen4 models are promised as open weights.

For context: Qwen3.8-Max is 2.4T-A95B, 92 layers, 512 experts top-10. One outlet reports Qwen4-Max as 2.4T total / 71B active; unconfirmed.

Questions:
- Is the 2.4T / 71B figure in the official blog, a staff statement or only press? Quote the source.
- Layers, experts, top-k, attention type, vision encoder, if described.
- Release dates and sizes of the promised open Qwen4 models, if announced.

## Evidence to look for, roughly in this order of value

- Official material: model cards, system cards, launch posts, API docs and pricing pages, staff statements. Quote exactly what is said about scale, compute or architecture.
- Serving speed: output tokens per second and time to first token vs the predecessor (Artificial Analysis, OpenRouter, cloud providers).
- Benchmark scaling vs open models of known size (Artificial Analysis Intelligence Index, Epoch ECI, SimpleQA-like factual recall).
- Credible reporting (The Information, SemiAnalysis). Treat rumours explicitly as rumours.

## Output

- One table: model, total params (central and range), dense or MoE, active params, layers, experts and top-k, parts outside the layers (vision encoder etc.), context window, modalities, confidence (high, medium, low), key evidence.
- For each model a clear verdict "new pretrain / post-trained version of X / distilled smaller model", with evidence and confidence.
- For each number, 1–3 sentences of reasoning with source links, marked "confirmed", "credible report" or "my inference".
- Contradictions between sources and popular rumours with your assessment.

A well-argued range is far more useful than a confident single number. If evidence is too thin for some parameter, say so.
