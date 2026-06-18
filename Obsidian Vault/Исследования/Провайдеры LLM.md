# Провайдеры LLM

## Проприетарные (API) — июнь 2026

| Провайдер | Флагман | Input $/1M | Output $/1M | Контекст | Сильные стороны |
|-----------|---------|:----------:|:-----------:|:--------:|-----------------|
| **Anthropic** | Claude Fable 5 | $15 | $25 | 200K | #1 кодинг (80.3% SWE-Bench Pro), Model Swap safety |
| **Anthropic** | Claude Opus 4.8 | $5 | $25 | 200K | Fast Mode (2.4x), баланс цена/качество |
| **Anthropic** | Claude Sonnet 4.6 | $3 | $15 | 200K | Кодинг, быстрый |
| **OpenAI** | GPT-5.5 Pro | $15 | $60 | 1M | Reasoning, Terminal-Bench #1 |
| **OpenAI** | GPT-5.5 | $5 | $30 | 1M | Универсальный, экосистема |
| **OpenAI** | GPT-5-mini | $0.50 | $2 | 128K | Дешёвый, быстрый |
| **Google** | Gemini 3.1 Pro | $2 | $12 | **2M** | #1 по контексту, ARC-AGI 77.1% |
| **Google** | Gemini 3.5 Flash | $1.50 | $9 | 1M | Быстрый, мультимодальный |
| **xAI** | Grok 4 | ~$3 | ~$15 | 256K | Real-time X данные |
| **DeepSeek** | DeepSeek-V3 | $0.27 | $1.10 | 128K | Самый дешёвый API |
| **Alibaba** | Qwen 3.6 Max | ~$1 | ~$4 | 256K | Мультиязычность |

### Claude Fable 5 (Anthropic) — #1 на июнь 2026

Релиз 9 июня 2026. Первый Mythos-class model, доступный публично.

- SWE-Bench Pro: **80.3%** (Opus 4.8: 69.2%, GPT-5.5: 58.6%)
- AA Intelligence Index: **61** (GPT-5.5: 60, Gemini 3.1: 57)
- **Model Swap**: классификатор направляет опасные запросы на Opus 4.8 (<5% сессий)
- **Fast Mode** (Opus 4.8): 2.4x ускорение с ~4% loss качества

### GPT-5.5 (OpenAI)

- Terminal-Bench 2.1: **78.2%** (лучший в терминале)
- Computer Use API — управление GUI (уникальная фича)
- Экосистема: ChatGPT, Codex, API — самый широкий охват
- Context: 1M токенов (400K в Codex)

### Gemini 3.1 Pro (Google)

- Context: **2M токенов** — самый большой среди frontier
- ARC-AGI-2: **77.1%** — лучшее абстрактное reasoning
- Цена: **$2/$12** — в 2-4x дешевле конкурентов
- Мультимодальный (текст + изображения + аудио + видео) из коробки

### Сравнение по задачам (июнь 2026)

| Задача | Победитель | Почему |
|--------|-----------|--------|
| **Сложный кодинг** | Claude Fable 5 | 80.3% SWE-Bench Pro |
| **Terminal/DevOps** | GPT-5.5 | 78.2% Terminal-Bench |
| **Длинный контекст** | Gemini 3.1 Pro | 2M токенов |
| **Бюджет** | Gemini 3.1 Pro | $2/$12, половина цены конкурентов |
| **Мультимодальный** | Gemini 3.1 Pro | Native audio/video/image |
| **Агенты (кодинг)** | Claude Fable 5 | Лучшее instruction following |
| **Reasoning** | Gemini 3.1 Pro | ARC-AGI 77.1% |
| **Экосистема** | GPT-5.5 | ChatGPT + Codex + API |

## Открытые модели (self-hosted) — июнь 2026

| Модель | Всего | Active | Лицензия | Контекст | Очки |
|--------|:----:|:------:|:---------:|:--------:|:----:|
| **Qwen 4 32B-A3B** | 32B | 3B | Apache 2.0 | 256K | 75 |
| **Qwen 4 Coder** | 32B | 3B | Apache 2.0 | 256K | **82% SWE** |
| **Llama 5 70B** | 70B | 70B | Community | 256K | 88% MMLU |
| **Mistral Small 4** | 119B | 6B | Apache 2.0 | 256K | — |
| **DeepSeek-V4** | ~600B | ~37B | MIT | 1M | ~85% SWE |
| **Grok 4 Open** | ~300B | ~40B | Apache 2.0 | 128K | — |
| **Phi-5 Medium** | 14B | 14B | MIT | 128K | Бьёт GPT-4 class |
| **Gemma 4 31B** | 31B | 31B | Apache 2.0 | 256K | 89.2% AIME |

### Qwen 4 Coder (Alibaba) — #1 open coder

- SWE-Verified: **82%** (бьёт GPT-5-mini с 78%)
- Apache 2.0 — можно использовать коммерчески без ограничений
- 32B total / 3B active — работает на Mac 24GB
- 58 tok/s на M4 Pro (Q4_K_M)

### Тренд: 70B dense tier

"Ренессанс плотных моделей" — после лета MoE, 70B dense снова конкурентны:
- **Llama 5 70B**: MMLU 88%, лучшая экосистема
- **Mistral Voyage Pro 70B**: Apache 2.0, агентный

## Инференс (self-hosted)

| Инструмент | Модели | Аппарат | Простота |
|-----------|--------|---------|:--------:|
| **Ollama** | Любые GGUF | CPU/GPU/Mac | ⭐⭐⭐⭐⭐ |
| **vLLM** | Любые | GPU (Linux) | ⭐⭐⭐ |
| **llama.cpp** | GGUF | CPU/GPU/Mac | ⭐⭐⭐ |
| **LM Studio** | GGUF | Mac/Windows GUI | ⭐⭐⭐⭐⭐ |
| **SGLang** | Любые | GPU | ⭐⭐⭐ |
| **GPT4All** | GGUF | CPU (любая ОС) | ⭐⭐⭐⭐ |

## Когда что выбирать

| Сценарий | Модель | Формат |
|----------|--------|--------|
| **Сложный кодинг, агенты** | Claude Fable 5 | API |
| **Локальный coding-ассистент** | Qwen 4 Coder (24GB Mac) | Ollama |
| **Production API (универсальный)** | GPT-5.5 | API |
| **Документы, длинный контекст** | Gemini 3.1 Pro | API |
| **Экономия, bulk processing** | Gemini 3.1 Pro / GPT-5-mini | API |
| **Приватность (enterprise)** | Llama 5 70B / Qwen 4 | Self-hosted (vLLM) |
| **Fine-tuning под задачу** | Llama 5 70B / Qwen 4 | Unsloth + Axolotl |
| **Edge / ноутбук** | Phi-5 Medium / Gemma 4 12B | Ollama |

---

**Связанные заметки:** [[LLM/История LLM]] [[LLM/Бенчмарки]] [[Архитектура LLM]] [[LLM/Инференс и оптимизация]]

#llm #ai #providers
