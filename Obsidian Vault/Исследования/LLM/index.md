# LLM — Большое исследование

Комплексное исследование Large Language Models: от истории и архитектуры до тренировки, инференса, бенчмарков и будущего.

## Разделы

| Раздел | О чём |
|--------|-------|
| [[LLM/Введение в ML и LLM]] | ML с нуля, практический roadmap, 5 уровней работы с LLM |
| [[LLM/История LLM]] | GPT-1 → Claude Fable 5, эволюция 2018–2026 |
| [[Архитектура LLM]] | Трансформеры, attention, MoE, Flash Attention |
| [[LLM/Тренировка LLM]] | Data pipeline, pretraining, alignment (RLHF/DPO) |
| [[LLM/Инференс и оптимизация]] | Квантование, KV cache, vLLM, домашний бенчмарк (i3-10105F / 1050 Ti) |
| [[LLM/Апгрейд ПК под LLM]] | Апгрейд ПК: RAM, GPU, что и зачем |
| [[LLM/Бенчмарки]] | Как измеряют LLM, текущие лидеры (июнь 2026) |
| [[Провайдеры LLM]] | OpenAI, Anthropic, Google, open-source — сравнение |
| [[LLM/Экосистема инструментов]] | Фреймворки, деплой, мониторинг, агенты |
| [[LLM/Безопасность и ограничения]] | Hallucinations, alignment, jailbreaks, bias |
| [[RAG]] | Retrieval-Augmented Generation |
| [[Fine-tuning]] | Дообучение (LoRA, QLoRA, RLHF) |
| [[Prompt Engineering]] | Промпт-инжиниринг |

## Ключевые моменты на июнь 2026

- **Frontier closed:** Claude Fable 5 (Anthropic) — #1 по кодингу (80.3% SWE-Bench Pro), Gemini 3.1 Pro — #1 по контексту (2M токенов) и цене ($2/$12), GPT-5.5 — #1 по terminal-агентам (78.2% Terminal-Bench)
- **Open-source:** Qwen 4 Coder 32B-A3B — #1 open coder (82% SWE-Verified, Apache 2.0), Llama 5 70B — новый флагман Meta, Mistral Small 4 — Apache 2.0, 119B/6B active
- **Архитектура:** MoE (Mixture of Experts) — стандарт де-факто, Flash Attention — обязателен, Speculative Decoding — x2 ускорение
- **Контекст:** 1M+ токенов — новый стандарт для frontier-моделей
- **Агенты:** LLM → агенты с инструментами — главный тренд 2026

---

**Связанные заметки:** [[Технологии/Supabase]] [[Технологии/GitHub]] [[Исследования/Сравнение языков программирования]]

#llm #research #ai
