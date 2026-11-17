# Промпт для глубокого исследования: размеры моделей Claude (Anthropic)

Для Gemini Deep Research или аналога. Ответ — на русском, с таблицей и ссылками.

---

Research task: estimate the scale and architecture of Anthropic's current Claude models, as of late October 2026: Claude Haiku 5.5, Claude Sonnet 5.5, Claude Opus 5.5 and Claude Fable 5.1. If the current lineup differs, use the latest models and say so.

Anthropic publishes no parameter counts, no architecture details and no open-weight models. Expect most numbers to be inferences, and be explicit about that. I need sensible scale estimates so the models can be compared with open models of known size. I do not need false precision. Answer in Russian.

For each model, estimate:
1. Total parameters (a central value and a plausible range).
2. Whether it is likely dense or MoE, and active parameters per token if MoE.
3. A plausible number of layers. Mark this clearly as inference.
4. Parts outside the main layers, such as a vision encoder. Note any audio capability.
5. Whether models share a base. For example, are Opus and Fable different pretrains? Are Sonnet and Haiku distilled from larger models?

Evidence to look for, roughly in this order of value:
- **Official Anthropic material.** This includes:
  - model cards and system cards (for example, sections on training compute or ASL levels);
  - launch posts;
  - the Responsible Scaling Policy, including compute thresholds;
  - statements by Anthropic staff.

  Quote exactly what is said about scale, compute or architecture. Many rumors exist about Claude, so separate statements from speculation.
- **Compute and infrastructure.** This includes:
  - Anthropic's compute deals (AWS Trainium and Project Rainier, Google TPUs, Nvidia);
  - training compute estimates by Epoch AI;
  - serving hardware, and what memory per node implies about maximum model size.
- **Serving economics.** This includes:
  - API prices per model (input, output, cached, batch, long-context tiers);
  - output speed and time to first token on Artificial Analysis and OpenRouter, from Anthropic, AWS Bedrock and Google Vertex, plus any fast or priority modes.

  Show how price and speed constrain total versus active parameters across the four tiers.
- **Benchmark scaling.** This includes:
  - the Artificial Analysis Intelligence Index;
  - Epoch ECI;
  - factual-recall benchmarks such as SimpleQA, which track model size;
  - comparison with open models of known size released in 2026: Kimi K3 2.8T-A104B, Qwen3.8 Max 2.4T-A95B, DeepSeek V4 Pro 1.65T-A49B, Mistral Large 4 ~1T-A52B, GLM-5.3 753B, gpt-oss-120b 117B-A5.1B;
  - comparison with closed-model estimates (GPT-6 Astra ~3.5T, GPT-6.1 Sol ~1.25T, GPT-6.1 Terra ~480B).
- **Leaks and credible reporting** from The Information, SemiAnalysis and Dylan Patel. Treat rumors explicitly as rumors.
- **Release history.** Knowledge cutoffs and release dates may hint at shared pretrains between models.

Output:
- A table with one row per model and these columns:
  - total params (central and range);
  - dense or MoE;
  - active params;
  - layers;
  - parts outside the layers;
  - confidence (high, medium or low);
  - key evidence.
- For each number, 1–3 sentences of reasoning with source links. Clearly mark each as "confirmed", "credible report" or "my inference".
- Context window and input/output modalities for each model, with sources.
- A list of contradictions between sources, and a list of popular rumors with your assessment of them.

A well-argued range is far more useful than a confident single number. If evidence is too thin for some parameter, say so.
