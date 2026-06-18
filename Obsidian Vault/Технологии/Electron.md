# Electron

**Тип:** Фреймворк для десктопных приложений  
**Сайт:** [electronjs.org](https://www.electronjs.org/)

Фреймворк для создания кросс-платформенных десктопных приложений на веб-технологиях (HTML, CSS, JS/TS).

## Архитектура

- **Main Process** — Node.js, доступ к ФС, системные вызовы, жизненный цикл окна
- **Renderer Process** — Chromium, изолированная «песочница», отрисовка UI
- **IPC (contextBridge)** — безопасный мост между процессами (защита от XSS)

## Используется в проектах

- [[Nox Task Manager]] — React 19 + Vite в Renderer
- [[Kinetic Launcher]] — Vanilla JS SPA в Renderer

**См. также:** [[Rust]] (Tauri — альтернатива на Rust, меньше размер, выше производительность)

#Electron #Framework #Desktop
