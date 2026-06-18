# Fine-tuning (Дообучение LLM)

**Идея:** LLM уже знает много (pre-training), но мы хотим настроить её под конкретный стиль/формат/задачу, используя небольшой датасет.

## Когда нужен

| Нужен | Не нужен |
|-------|----------|
| Определённый стиль ответов | Просто знание документов → RAG |
| Форматированный вывод (JSON, code) | Единичные вопросы |
| Узкая доменная задача | Часто меняющиеся данные |
| Токенэкономия (меньше промпт) | Хватает system prompt |
| Снижение галлюцинаций | Есть бюджет на большой контекст |

## Техники

### Full Fine-tuning
- Обновляются все веса модели
- Требует много GPU памяти
- Результат: полная копия модели (LoRA → можно смержить)

### LoRA (Low-Rank Adaptation)
```
W_new = W_original + A·B
                   (LoRA rank r)
```
- Замораживаем исходные веса, обучаем маленькие матрицы A и B
- Rank r = 4–128 (гиперпараметр)
- Файл адаптера — мегабайты вместо гигабайтов
- Можно несколько LoRA-адаптеров на одну базу

### QLoRA
- LoRA + 4-bit quantization базы
- Fine-tuning Llama-2 70B на одной 48GB GPU
- Потеря качества минимальна

### RLHF (Reinforcement Learning from Human Feedback)
- Обучение через предпочтения человека
- Шаги: SFT → Reward Model → PPO
- Используется в ChatGPT, Claude

## Датасет

Формат:
```json
[
  {
    "instruction": "Напиши функцию на Python для сортировки списка",
    "output": "def sort_list(items):\n    return sorted(items)"
  }
]
```

Форматы: Alpaca, ShareGPT, OpenAI messages.

Популярные датасеты: OpenAssistant, Dolly, OpenOrca, self-instruct.

## Процесс

```
1. Собрать датасет (100–10000 примеров)
2. Выбрать модель-базу (Llama, Mistral, Qwen)
3. Выбрать метод (LoRA / QLoRA)
4. Настроить гиперпараметры (lr, rank, epochs)
5. Обучить (от минут до дней)
6. Протестировать (eval set)
7. Смержить LoRA или загрузить адаптер
```

## Инструменты

| Инструмент | Особенности |
|------------|-------------|
| **transformers** (Hugging Face) | Trainer, SFTTrainer |
| **unsloth** | В 2x быстрее, меньше памяти |
| **axolotl** | YAML-конфиги, много фич |
| **LLaMA-Factory** | Web UI для fine-tuning |
| **lit-gpt** | Минималистичная имплементация |

## Проблемы

| Проблема | Решение |
|----------|---------|
| **Overfitting** | Маленький датасет → early stopping, регуляризация |
| **Catastrophic forgetting** | Merger LoRA, multitask обучение |
| **Галлюцинации сильнее** | Датасет с верными фактами |
| **Дорого** | QLoRA, Unsloth, облачные GPU (Lambda, RunPod) |

---

**Связанные заметки:** [[Архитектура LLM]] [[RAG]] [[Провайдеры LLM]] [[Python]]

#llm #fine-tuning #lora #deep-learning
