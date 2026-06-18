# Zig

**Тип:** Systems programming language  
**Владелец:** Zig Software Foundation  
**Статус:** pre-1.0 (активная разработка)  

## Ключевые особенности

- **No hidden control flow** — нет перегрузки операторов, исключений, RAII
- **Compile-time execution** — `comptime` блоки исполняются на этапе компиляции
- **Manual memory management** — нет GC, нет borrow checker'а (как C)
- **C ABI compatible** — `@cImport` для заголовков C
- **Build system** — собственная система сборки (не make/cmake)
- **`defer`** — отложенный вызов для cleanup
- **`allocator` everywhere** — явная передача аллокатора

## Сравнение с C

| Zig | C |
|-----|---|
| `comptime` вместо препроцессора | `#define`, макросы |
| `defer` вместо goto cleanup | `goto` для освобождения ресурсов |
| `@cImport` для C-заголовков | Сишные заголовки напрямую |
| Встроенная система сборки | CMake, Makefile |
| Опциональный тип `?T` | NULL-указатели |
| `anyerror` — глобальный тип ошибок | errno |

## Когда использовать

- **Замена C** — драйверы, эмбеддед, ОС
- **Кросскомпиляция** — Zig — лучший кросс-компилятор C/C++ вне Zig
- **Выступление** — performance критичный код
- **Инструменты сборки** — `zig build` заменяет make/cmake

**Не подходит для:** продакшена (pre-1.0), веба, микросервисов, ML/AI.

---

**Связанные заметки:** [[Rust]] [[Go]] [[Сравнение языков программирования]]

#zig #systems-programming #compiler
