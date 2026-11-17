# Промпт для глубокого исследования: размеры закрытых моделей OpenAI

Для Gemini Deep Research или аналога. Ответ — на русском, с таблицей и ссылками.

---

Research task: estimate the architecture of OpenAI's current closed models — GPT-6 Luna, GPT-6.1 Terra, GPT-6.1 Sol and GPT-6 Astra (as of late October 2026). OpenAI does not publish parameter counts, so I need the best evidence-based estimates, with each piece of evidence and its reliability stated explicitly. Answer in Russian.

For each model, estimate:
1. Total parameters (a central value and a plausible range).
2. Active parameters per token (if MoE).
3. Number of transformer layers.
4. Whether it is a mixture-of-experts model, and if so: number of experts, experts active per token, shared experts, and any dense layers.
5. Any parts outside the layers: vision encoder, large embedding tables, or n-gram or engram memory.

Evidence to look for, roughly in this order of value:
- Official OpenAI statements: system cards, launch posts, DevDay 2026 talks, research papers, and staff posts on X or Hacker News. For example, Ted Sanders described the ordering "Luna < Terra < Sol < Astra".
- Leaks or credible reporting from The Information, SemiAnalysis, Epoch AI, or Dylan Patel. Separate confirmed reporting from rumors. One example is the unverified "10 trillion parameters" claim for Astra.
- Serving economics: API prices (input, output, cached, and the >272k long-context tier), tokens per second and time to first token on Artificial Analysis, OpenRouter and Azure, priority, fast and ultrafast tiers, and what hardware they run on (GB200/GB300 NVL72, Cerebras, other). Show how price and speed constrain total versus active parameters.
- Architecture lineage: gpt-oss-120b and gpt-oss-20b are open-weight OpenAI MoE models with known configs (36 layers, 128 experts, top-4; and 24 layers, 32 experts, top-4). Check whether these models are believed to share design choices. Also look for any estimates of GPT-4, GPT-4.5 and GPT-5.x sizes, as reference points for the trend.
- Benchmark and capability scaling: Artificial Analysis Intelligence Index, Epoch AI compute estimates, and comparisons with open models of known size released in 2026 (Kimi K3 2.8T-A104B, Qwen3.8 Max 2.4T-A95B, DeepSeek V4 Pro 1.65T-A49B, Mistral Large 4 ~1T-A52B, GLM-5.3 753B).
- Knowledge cutoffs and release dates, which may hint at shared base models between generations. For example, is Terra a distillation of Sol? Is Luna a separate small model?

Output:
- A table with one row per model and these columns: total params (central and range), active params, layers, experts (total and active), confidence (high, medium or low), and key evidence.
- For each number, 1–3 sentences of reasoning with source links. Clearly separate "confirmed", "credible report" and "my inference".
- A list of contradictions between sources.
- Also any data on the context window and the input/output modalities (text, image, audio), with sources.

Do not invent precision: a well-argued range is better than a confident single number.
