# Промпт для глубокого исследования: Claude Fable 5.2 и Mythos 5.2

Для Gemini Deep Research или другого агента-исследователя. Ответ — на русском, с таблицей и ссылками.
Результат положить в `docs/research-anthropic-fable-5-2.md`.

---

Research task: estimate the scale and architecture of Claude Fable 5.2 and Claude Mythos 5.2, announced by Anthropic on November 9, 2026 (https://www.anthropic.com/claude-fable-and-mythos-5-2), and decide whether they are a new pretrain or a post-trained version of Claude Fable 5.1 / Mythos 5.1. Answer in Russian.

Anthropic publishes no parameter counts and no architecture details. Expect most numbers to be inferences, and be explicit about that. I need a sensible scale estimate to compare with open models of known size, not false precision.

## What is already known (official, from the launch post)

- "Claude Fable and Claude Mythos are the same underlying model." Fable has cyber and biology safeguards; Mythos is available to verified organizations only.
- Outputs are generated "up to 30% faster" than Fable 5.1 / Mythos 5.1.
- Price is lower: $8 / $40 per million input / output tokens. Fable 5.1 was $10 / $50.
- Optional fast mode: up to 2.5× faster generation at $16 / $80.
- Improvements in coding, reasoning and vision. Fewer tokens per task than Fable 5.1 at the same effort.
- API id `claude-fable-5-2`. A system card exists: "Claude Fable 5.2 and Mythos 5.2 System Card".

## Our current estimates, for context (all are inferences, low confidence)

| Model             | Total                | Active | Layers | Experts (top-k) |
| ----------------- | -------------------- | ------ | ------ | --------------- |
| Claude Fable 5.1  | ~7T (range 4–10T)    | ~320B  | 120    | 384 (18)        |
| Claude Opus 5.5   | ~4.8T (range 3–5.5T) | ~135B  | 96     | 384 (11)        |
| Claude Sonnet 5.5 | ~1.8T                | ~50B   | 64     | 256 (7)         |
| Claude Haiku 5.5  | ~60B                 | ~5B    | 40     | 64 (5)          |

Challenge these if the new evidence points elsewhere, in particular the Fable 5.1 figure.

## Questions

1. **New pretrain or post-training?** Is Fable 5.2 built on the same base as Fable 5.1, or is it a new pretrain? Look for:
   - knowledge cutoff dates of 5.1 and 5.2;
   - wording in the system card and launch post about training;
   - rumours reported before launch (a reported "new pretraining expected in early October"); treat them as rumours.
2. **Total and active parameters** of Fable 5.2 (central value and range). Explain what the 20% lower price and up to 30% higher speed imply: a smaller or sparser model, better serving hardware, speculative decoding, or only lower margins?
3. **Fast mode.** What does 2.5× speed at 2× price imply about how it is served (more chips per request, smaller batches, a distilled draft model)? Does it change the size estimate?
4. **Layers and experts.** A plausible layer count and MoE configuration. Mark clearly as inference.
5. **Parts outside the main layers,** such as a vision encoder, given the stated vision improvements.
6. **Context window and input/output modalities,** with sources (API docs, system card).

## Evidence to look for, roughly in this order of value

- **Official Anthropic material:** the system card (sections on training data, compute, ASL level, knowledge cutoff), the launch post, API docs and pricing pages, statements by Anthropic staff. Quote exactly what is said about scale, compute or architecture.
- **Serving speed:** output tokens per second and time to first token for Fable 5.1 and 5.2, normal and fast mode, on Artificial Analysis, OpenRouter, AWS Bedrock, Google Vertex and Azure.
- **Benchmark scaling:** Artificial Analysis Intelligence Index, Epoch ECI, factual-recall benchmarks such as SimpleQA, compared with Fable 5.1, Opus 5.5 and open models of known size (Kimi K3.1 Pro 2.8T-A104B, Qwen3.8 Max 2.4T-A95B, DeepSeek V4 Pro 1.65T-A49B, Inkling 975B-A41B, Mistral Large 4 ~1T-A52B).
- **Compute and infrastructure:** Anthropic compute deals (Trainium / Project Rainier, Google TPUs, Nvidia), Epoch AI training-compute estimates.
- **Credible reporting:** The Information, SemiAnalysis. Treat rumours explicitly as rumours.

## Output

- A table for Fable 5.2 / Mythos 5.2 (and corrected Fable 5.1, if needed) with: total params (central and range), dense or MoE, active params, layers, experts and top-k, parts outside the layers, context window, modalities, confidence (high, medium or low), key evidence.
- A clear verdict on "new pretrain vs post-trained Fable 5.1", with the evidence and a confidence level.
- For each number, 1–3 sentences of reasoning with source links. Mark each as "confirmed", "credible report" or "my inference".
- A list of contradictions between sources and a list of popular rumours with your assessment.

A well-argued range is far more useful than a confident single number. If evidence is too thin for some parameter, say so.
