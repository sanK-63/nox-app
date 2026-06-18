# RAG (Retrieval-Augmented Generation)

**Проблема:** LLM знает только то, на чём обучен (срез данных). Не знает ваши документы, не знает свежих событий, галлюцинирует.

**Решение:** RAG — перед ответом LLM ищет релевантную информацию в вашей базе знаний, и генерирует ответ на основе найденного.

## Схема

```
Запрос пользователя
        ↓
   ┌──────────┐     ┌──────────────────────┐
   │   Query  │────→│  Vector Database     │
   │ Encoder  │     │  (Chroma, Pinecone)  │
   └──────────┘     └──────────────────────┘
        ↓                      ↓
   Embedding(query)   Поиск top-K по cosine similarity
        ↓                      ↓
        └───────┬──────────────┘
                ↓
   ┌─────────────────────────┐
   │   Prompt = Система +    │
   │   контекст + запрос     │
   └─────────────────────────┘
                ↓
           LLM → ответ
```

## Компоненты

### 1. Chunking (разбиение документов)
- Фиксированный размер (256–2048 токенов)
- Semantic chunking по абзацам/разделам
- Recursive chunking с перекрытием (overlap)

### 2. Embeddings
- Текст → вектор (обычно 768–1536 dimensions)
- Модели: `text-embedding-3-small`, `BGE`, `E5`, `Jina`
- Маленькие модели достаточно (даже 100MB)

### 3. Vector Database
| База | Тип | Когда |
|------|-----|-------|
| Chroma | Встраиваемая | Прототипы, маленькие проекты |
| Pinecone | Cloud | Продакшн, большие нагрузки |
| Qdrant | Self-hosted / Cloud | Гибкий контроль |
| pgvector | PostgreSQL | Уже есть Postgres |
| Milvus | Distributed | Очень большие датасеты |

### 4. Retrieval (поиск)
- **Similarity search** — cosine similarity / dot product
- **Hybrid search** — векторный + keyword (BM25)
- **Multi-query** — несколько вариантов запроса
- **Reranking** — cross-encoder для переранжирования

### 5. Generation
```
System: Ты — ассистент. Отвечай на основе контекста.
Контекст: {найденные документы}
Запрос: {вопрос пользователя}
```

## Вариации RAG

| Вариант | Описание |
|---------|----------|
| **Naive RAG** | Chunk → embed → search → generate |
| **Advanced RAG** | Pre-retrieval (query rewriting) + post-retrieval (reranking) |
| **Modular RAG** | Поиск по нескольким источникам, агенты |
| **Graph RAG** | Извлечение сущностей + связей → Knowledge Graph |
| **Agentic RAG** | LLM сам решает когда и как искать |

## Проблемы RAG

| Проблема | Решение |
|----------|---------|
| **Плохой chunking** | Semantic chunking, overlap |
| **Low recall** | Multi-query, hyde (гипотетические документы) |
| **Low precision** | Reranker, порог similarity |
| **Lost in the middle** | LLM хуже видит середину контекста → релевантные куски в начало/конец |
| **Latency** | Кэширование, маленькие embedding модели |

## Когда RAG, а когда Fine-tuning?

| RAG | Fine-tuning |
|-----|-------------|
| Свежие/меняющиеся данные | Фиксированный стиль/формат |
| Много документов (>1000) | Конкретная задача |
| Нужно объяснение (откуда взял) | Нужен контроль вывода |
| Быстрое прототипирование | Требуется улучшение базовых знаний |
| Нет GPU для обучения | Есть GPU/API для обучения |

---

**Связанные заметки:** [[Архитектура LLM]] [[Fine-tuning]] [[Провайдеры LLM]] [[Python]]

#rag #llm #search #embeddings
