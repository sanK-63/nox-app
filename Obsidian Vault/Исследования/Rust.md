# Rust

**Тип:** Systems programming language  
**Владелец:** Mozilla → Rust Foundation  
**Релиз:** 1.0 в 2015  

## Ключевые особенности

- **Ownership + Borrow Checker** — управление памятью без GC, гарантии безопасности на этапе компиляции
- **Zero-cost abstractions** — высокоуровневые конструкции без накладных расходов
- **Traits** — аналог typeclass'ов из Haskell, альтернатива наследованию
- **Pattern Matching** — мощный `match` с деструктуризацией
- **Fearless Concurrency** — `Send`/`Sync`, каналы, мьютексы на уровне типов
- **Cargo** — сборка, пакетный менеджер, тесты, бенчмарки

## Экосистема

| Инструмент | Назначение |
|------------|-----------|
| tokio | Асинхронный рантайм |
| actix-web / axum | Веб-фреймворки |
| serde | Сериализация/десериализация |
| clap | Парсинг CLI-аргументов |
| rusqlite / diesel | SQLite / ORM |
| tauri | Десктопные приложения (альтернатива Electron) |
| wasm-pack | WebAssembly |
| polars | DataFrames (альтернатива pandas) |

## Сравнение с C++

| Rust | C++ |
|------|-----|
| Безопасность на уровне компилятора | UB — ответственность программиста |
| borrow checker вместо GC | RAII + умные указатели |
| `cargo` + crates.io | vcpkg, Conan, ручное |
| `match` без `default` | `switch` с провалами |
| `Result<T, E>` вместо исключений | Исключения (try/catch) |

---

**Связанные заметки:** [[Go]] [[Zig]] [[Сравнение языков программирования]] [[Tauri]]

#rust #systems-programming
