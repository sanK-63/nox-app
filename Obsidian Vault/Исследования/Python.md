# Python

**Тип:** Dynamic, interpreted, multi-paradigm  
**Владелец:** Python Software Foundation  
**Релиз:** 1991  

## Ключевые особенности

- **Dynamic typing** — быстрая разработка, но больше ошибок в рантайме
- **Garbage collection** — reference counting + generational GC
- **WSGI/ASGI** — веб-стандарты (Flask, FastAPI, Django)
- **GIL** — Global Interpreter Lock (ограничение многопоточности)
- **Type hints** — опциональная типизация (PEP 484), `mypy` для проверки
- **Async/await** — асинхронность через asyncio/anyio

## Экосистема

| Область | Инструменты |
|---------|------------|
| ML/AI | PyTorch, TensorFlow, JAX, scikit-learn, transformers |
| Data | pandas, polars, numpy, matplotlib, jupyter |
| Веб | FastAPI, Flask, Django, Starlette |
| CLI | rich, click, typer, textual |
| Dev | poetry, uv, pytest, ruff, mypy |
| LLM | langchain, llama.cpp, vllm, openai-python |

## Сравнение: Python vs

| Python | Rust/Go |
|--------|---------|
| Динамическая типизация + type hints | Статическая, строгая |
| GIL — ограничение многопоточности | Нативная конкурентность |
| Интерпретируемый | Компилируемый |
| ML/AI — экосистема №1 | ML — только через биндинги |
| Медленный, но C bindings спасают | Быстрый из коробки |

---

**Связанные заметки:** [[Rust]] [[Go]] [[Сравнение языков программирования]] [[Архитектура LLM]] [[RAG]]

#python #ml #ai
