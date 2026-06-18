# История LLM (2017–2026)

## 2017 — Рождение трансформеров

**"Attention Is All You Need"** (Vaswani et al., Google) — бумага, запустившая эру LLM. Предложена архитектура Transformer, заменившая RNN/LSTM во всех NLP-задачах.

## 2018–2019 — Первые LLM

| Модель | Год | Параметры | Прорыв |
|--------|-----|-----------|--------|
| **GPT-1** | 2018 | 117M | Generatve Pre-Training — первый большой LM |
| **BERT** | 2018 | 340M | Bidirectional — понимание контекста слева и справа |
| **GPT-2** | 2019 | 1.5B | Генерация связного текста (OpenAI не выпустила сразу из-за "опасности") |
| **T5** | 2019 | 11B | Text-to-Text — всё как перевод |

## 2020 — Scaling Laws

Бумага Kaplan et al.: **точность растёт степенным образом** с размером модели, датасета и compute. Вывод: просто делайте больше → будет лучше. Запустило гонку масштабирования.

- **GPT-3** (175B) — in-context learning, few-shot без fine-tuning
- **DALL-E** — текст → изображение

## 2021–2022 — Alignment

| Модель | Комментарий |
|--------|-------------|
| **Codex** | GPT-3 fine-tuned на GitHub → GitHub Copilot |
| **InstructGPT/GPT-3.5** | RLHF (обучение с подкреплением по предпочтениям человека) |
| **Chinchilla** (DeepMind) | Оптимальное соотношение параметров и данных — модели **недообучены** |
| **LLaMA** (Meta) | Меньше параметров, больше данных — открытые веса |
| **Stable Diffusion** | Текст → изображение (open-source) |
| **ChatGPT** (ноябрь 2022) | GPT-3.5 + RLHF + чат-интерфейс → 100M пользователей за 2 месяца |

## 2023 — Взрыв

- **GPT-4** — мультимодальный (текст + изображения), reasoning
- **Claude 2** (Anthropic) — конкурент GPT-4, безопасность
- **LLaMA 2** (Meta) — открытые веса, коммерческое использование
- **Mistral 7B** — лучшая маленькая модель, Apache 2.0
- **Mixtral 8x7B** — первый открытый MoE (Mixture of Experts)
- **QLoRA** — fine-tuning 65B на одной 48GB GPU
- **RAG** стал мейнстримом (LangChain, LlamaIndex)

## 2024 — Open-source догоняет

- **GPT-4o** — omni (текст + аудио + изображения в реальном времени)
- **Claude 3** (Opus/Sonnet/Haiku) — 200K контекст
- **Llama 3** (70B, 405B) — открытые веса GPT-4 уровня
- **Mistral Large** — сильный европейский конкурент
- **DeepSeek-V2** — MoE, дешёвый инференс
- **Gemini 1.5** (Google) — 1M контекст
- **Qwen 2** (Alibaba) — сильная мультиязычность
- **o1** (OpenAI) — reasoning model (Chain-of-Thought на тест-тайме)
- **FLUX** — лучшая open-source генерация изображений
- **Sora** — текст → видео (OpenAI, не выпущен публично)

## 2025 — Reasoning и агенты

- **DeepSeek-R1** — open-source reasoning, догоняет o1 (бум в Китае)
- **o3** — сильнейший reasoning (ARC-AGI 87.5%)
- **Claude 3.5/4** — agentic coding, computer use
- **Gemini 2.5 Pro** — 1M контекст, thinking mode
- **GPT-5** — унификация GPT-4o + o-series + Codex
- **Llama 4** (Scout/Maverick/Behemoth) — MoE, 10M контекст (Scout)
- **DeepSeek-V3** — 671B MoE, 1M контекст, GPT-4 уровня
- **QWEN 3** (235B MoE) — сильнейшая мультиязычность
- **Mistral Large 2/3** — Apache 2.0, сильное reasoning
- **Gemma 3** (Google) — открытые веса, 27B
- **Phi-4** (Microsoft) — 14B, качество GPT-4 уровня

## 2026 — Эра агентов и открытого фронтира

### Q1 2026

| Дата | Событие |
|------|---------|
| Январь | **Gemini 3 Pro** — лидер reasoning (ARC-AGI 77.1%), 2M контекст |
| Февраль | **Claude Opus 4.6** — SWE-Bench 80.8%, Agent Teams |
| Февраль | **Qwen 3.5** (397B-A17B MoE) — Apache 2.0, мультимодальный |
| Март | **Mistral Small 4** — 119B/6B active, Apache 2.0, унификация 4 моделей |
| Март | **GPT-5.4** — Terminal-Bench 77.3%, Computer Use API |

### Q2 2026

| Дата | Событие |
|------|---------|
| Апрель | **Gemma 4** (31B, Apache 2.0) — AIME 89.2% |
| Апрель | **Claude Opus 4.7** — SWE-Bench Verified 87.6% |
| Апрель | **GPT-5.5** — унификация, 1M контекст |
| Май | **Qwen 3.6** (35B-A3B) — 73.4% SWE-Verified, 3B active |
| Май | **GPT-5.5 Pro** — энтерпрайз-ярус |
| Май | **Claude Opus 4.8** — Fast Mode (2.4x ускорение) |
| **Июнь 9** | **Claude Fable 5** — первый Mythos-class, 80.3% SWE-Bench Pro |
| **Июнь** | **Qwen 4 Coder** (32B-A3B) — 82% SWE-Verified, Apache 2.0 |
| **Июнь** | **Llama 5 70B** — новый флагман Meta (dense) |
| **Июнь** | **Phi-5 Medium** (14B) — бьёт GPT-4-class |
| **Июнь** | **Grok 4 Open** — первый open-weight от xAI |

### Frontier-модели на июнь 2026

```
Качество кодинга (SWE-Bench Pro)
        ↑
Claude Fable 5  │ ████████████████████ 80.3%
Claude Opus 4.8 │ █████████████████    69.2%
GPT-5.5         │ ██████████████       58.6%
Gemini 3.1 Pro  │ █████████████        54.2%
Claude Opus 4.7 │ ██████████████████   64.3%
                └─────────────────────────→
```

```

Стоимость ($/1M output)
        ↓
GPT-5.5 Pro    │ ████████████████████ $60
GPT-5.5        │ ██████████           $30
Claude Fable 5 │ █████████            $25
Claude Opus 4.8│ █████████            $25
Gemini 3.1 Pro │ █████                $12
Gemini 3.5 Fl  │ ███                  $9
Qwen 4 (local) │ █                    ~$0 (self-host)
                └─────────────────────────→
```

---

**Связанные заметки:** [[Архитектура LLM]] [[Провайдеры LLM]] [[LLM/Бенчмарки]] [[LLM/Тренировка LLM]]

#llm #history #timeline
