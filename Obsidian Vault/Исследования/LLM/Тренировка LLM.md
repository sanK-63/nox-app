# Тренировка LLM

Полный пайплайн создания LLM: от сбора данных до готового ассистента.

## Этап 1: Data Pipeline

### Сбор данных
- **Common Crawl** — основной источник (petabytes веба)
- **Книги** — arXiv, PubMed, библиотеки (качественный текст)
- **Код** — GitHub (The Stack, StarCoder datasets)
- **Мультиязычные** — Wikipedia, многоязычные корпуса
- **Фильтрация**: дедупликация (MinHash), quality filtering (FastText classifier), PII removal

### Токенизация
- BPE (Byte-Pair Encoding) — стандарт
- Размер словаря: 32K–256K токенов
- GPT-5.5: ~100K словарь
- Llama 4: 128K словарь
- Qwen 4: 152K словарь (оптимизация под мультиязычность)

### Пример: датасет Llama 4
```
Common Crawl       ████████████████████████████████  15TB
Книги              ████                              2TB
Код                ███████                           3.5TB  
Научные статьи     ███                               1.5TB
Мультиязычные      █████                            2.5TB
Фильтрация         → 30-40% исходного объёма
```

## Этап 2: Pretraining

### Цель
Predict next token (causal language modeling) на триллионах токенов.

### Гиперпараметры
| Модель | Параметры | Токены обучения | Compute (FLOPs) |
|--------|-----------|----------------|-----------------|
| GPT-3 | 175B | 300B | 3.1e23 |
| Llama 3 405B | 405B | 15.6T | 6.9e24 |
| GPT-4 | ~1.8T (?) | ~13T | ~2e25 |
| DeepSeek-V3 | 671B (MoE) | 14.8T | 2.8e24 |
| Gemini 3 Pro | ~500B (?) | ~20T | ~5e24 |

### Scaling Laws (Chinchilla)
**Оптимум:** 20 токенов обучения на 1 параметр модели.
- До Chinchilla: модели были *недообучены* (GPT-3: 175B параметров, 300B токенов — нужно 3.5T)
- После Chinchilla: все следуют правилу (Llama 3 405B: 405B × 20 ≈ 8T, обучено на 15.6T)

### Процесс
```
1. Инициализация весов (случайно)
2. Forward pass → логиты → loss (cross-entropy)
3. Backward pass → градиенты
4. Optimizer step (AdamW)
5. Repeat × триллионы шагов
```

- 3D Parallelism (Data Parallel + Tensor Parallel + Pipeline Parallel)
- FP8/mixed precision training
- **Checkpointing** каждые несколько часов
- Hardware: 16K–100K GPU (H100/B200), соединённых NVLink + InfiniBand
- Время: недели–месяцы
- Стоимость: $50M–$500M (электроэнергия + GPU amortization)

## Этап 3: Post-Training

### 3a. Instruction Fine-tuning (SFT)
- Датасеты: OpenAssistant, LIMA, self-instruct, датасеты от людей
- 10K–100K примеров (качество важнее количества)
- Цель: модель учится следовать инструкциям

### 3b. Alignment (RLHF / DPO)

```
RLHF (RL from Human Feedback):
1. SFT → базовая модель
2. Сбор предпочтений: человек выбирает лучший ответ (A > B)
3. Обучение Reward Model (RM) — предсказывать, какой ответ лучше
4. PPO (Proximal Policy Optimization) — оптимизация LLM под RM

DPO (Direct Preference Optimization):
1. Сбор предпочтений
2. Прямая оптимизация через loss (без RM)
→ Проще, дешевле, часто не хуже RLHF
```

### 3c. Дополнительные этапы
- **Long-context fine-tuning** — расширение контекстного окна (YaRN, NTK-aware scaling)
- **Safety fine-tuning** — отказ от вредных запросов
- **Red teaming** — поиск уязвимостей
- **Model merging** — объединение нескольких fine-tuned версий

## Сравнение подходов к alignment

| Метод | Сложность | Результат | Используют |
|-------|-----------|-----------|------------|
| RLHF (PPO) | Высокая (4 модели) | Лучший контроль | OpenAI, Anthropic |
| DPO | Низкая (1 модель) | Почти как RLHF | DeepSeek, Mistral |
| SimPO | Низкая (1 модель, без reference) | Сравнимо с DPO | Open-source |
| KTO | Низкая | Хорош для бинарных данных | — |
| GRPO | Средняя (без RM) | Бюджетный RL | DeepSeek-R1 |

## Этап 4: Evaluation

Перед релизом модель проходит тысячи тестов:
1. **Бенчмарки** — MMLU, HumanEval, GSM8K, GPQA (см. [[LLM/Бенчмарки]])
2. **Human eval** — люди оценивают качество (LMSYS Arena, Elo)
3. **Safety eval** — red teaming, jailbreak тесты
4. **Domain-specific** — кодинг, медицина, юриспруденция

## Что изменилось к 2026 году

- **Data quality > quantity** — после Chinchilla фокус на качестве данных
- **Synthetic data** — LLM генерируют данные для обучения следующих LLM (но есть риск коллапса)
- **Test-time compute** — reasoning модели (o3, DeepSeek-R1) додумывают на инференсе
- **MoE** — стандарт для масштабирования (DeepSeek-V3: 671B total / 37B active)
- **FP8 training** — стандарт для новых GPU (H100/B200)
- **Open-source recipes** — большинство деталей тренировки известно (но data — секрет)

---

**Связанные заметки:** [[Архитектура LLM]] [[Fine-tuning]] [[LLM/Инференс и оптимизация]] [[LLM/Бенчмарки]]

#llm #training #alignment #rlhf
