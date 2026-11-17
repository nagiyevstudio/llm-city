# Промпт для глубокого исследования: размеры закрытых моделей Google

Для Gemini Deep Research или аналога. Ответ — на русском, с таблицей и ссылками.

---

Research task: estimate the architecture of Google's current closed models, as of late October 2026:
- Gemini 3.5 Flash-Lite
- Gemini 3.8 Flash
- Gemini 4 Argon
- Gemini 4 Carbon
- Gemini 3.5 Transcribe
- Nano Banana 2.1 (gemini-nano-banana-2.1, the successor to Nano Banana 2 / Gemini 3.1 Flash Image)

Google does not publish parameter counts, so I need the best evidence-based estimates. State each piece of evidence and its reliability explicitly. Answer in Russian.

For each model, estimate:
1. Total parameters (a central value and a plausible range).
2. Active parameters per token. Gemini is reported to be a sparse MoE.
3. Number of transformer layers, and whether any layers are reused (recurrent depth or looped layers). If so, how many layers and how many passes.
4. MoE configuration: number of experts, experts active per token, shared experts, and dense layers.
5. Parts outside the main layers: vision, audio and video encoders, embedding tables, the image decoder for Nano Banana, and the audio encoder for Transcribe (for example, whether it is USM-like and its size).
6. Whether models share a base. For example: is Carbon the same base model as Argon with more post-training, or a larger model? Are Flash-Lite, Flash and Transcribe derived from one base?

Evidence to look for, roughly in this order of value:
- **Official Google and DeepMind material.** This includes:
  - Gemini technical reports (2.5, 3, 3.x, 4) and model cards;
  - Google I/O and Cloud Next talks, and blog posts;
  - staff statements on X and Hacker News, and Jeff Dean and Oriol Vinyals interviews;
  - statements about MoE, distillation, TPU generations (Trillium, Ironwood and later), and serving.
- **Gemma open models as an architecture lineage**, the way gpt-oss is for OpenAI. Use the published configs of the latest Gemma generation (and Gemma 3 and Gemma 3n): layer counts, hidden sizes, attention patterns (local/global interleaving), vocabulary size and embedding share, any MoE variants, and per-layer embeddings or MatFormer tricks. Assess which design choices likely carry over to Gemini.
- **Serving economics.** This includes:
  - API prices: input, output, cached, long-context tiers, and introductory versus standard pricing, for example Argon at $2/$10, rising to $4/$20 on Dec 1;
  - output speed and time to first token on Artificial Analysis and OpenRouter;
  - TPU memory per pod or slice.

  Show how price and speed constrain total versus active parameters. Note that TPU speeds are not directly comparable with Nvidia-served models.
- **Leaks and credible reporting** from The Information, SemiAnalysis, Epoch AI and Dylan Patel. Separate confirmed reporting from rumors.
- **Benchmark scaling.** This includes:
  - the Artificial Analysis Intelligence Index: Flash-Lite 12, 3.8 Flash 31, Argon 50, Carbon 59;
  - Epoch compute estimates and ECI;
  - factual-recall benchmarks such as SimpleQA, which track model size;
  - comparison with open models of known size released in 2026: Kimi K3 2.8T-A104B, Qwen3.8 Max 2.4T-A95B, DeepSeek V4 Pro 1.65T-A49B, Mistral Large 4 ~1T-A52B, GLM-5.3 753B, gpt-oss-120b 117B-A5.1B;
  - comparison with closed OpenAI estimates (GPT-6.1 Terra ~480B, GPT-6.1 Sol ~1.25T, GPT-6 Astra ~3.5T).
- **Release history.** Knowledge cutoffs, release dates and the naming change (Flash and Pro tiers versus Argon and Carbon) may reveal which models share a base.

For Nano Banana 2.1, also explain how it generates images: autoregressive image tokens from a Gemini model, diffusion, or a hybrid. Estimate the size of any separate image decoder.

For Gemini 3.5 Transcribe, also explain how streaming (live) transcription works architecturally, and how the audio encoder relates to USM or Chirp.

Output:
- A table with one row per model and these columns:
  - total params (central and range);
  - active params;
  - layers (and loops, if any);
  - experts (total, active, shared);
  - parts outside the layers, with sizes;
  - confidence (high, medium or low);
  - key evidence.
- For each number, 1–3 sentences of reasoning with source links. Clearly mark each as "confirmed", "credible report" or "my inference".
- Context window and input/output modalities for each model, with sources.
- A list of contradictions between sources.

Do not invent precision: a well-argued range is better than a confident single number.
