
**Статус:** `Активный`  
**Тип:** Кастомный лаунчер для [[Minecraft]] (SPA-десктоп)  
**Философия:** Чистый интерфейс страниц, отказ от сайдбаров, безопасность сессий

---

## Команда

**__sanK**

---

## Состав проекта

Проект делится на три компонента:

| Компонент | Описание |
|-----------|----------|
| **Лаунчер** | Десктопное приложение на [[Electron]] (рендерер + main process + `minecraft-launcher-core`) |
| **Сервер** | Бэкенд на Supabase (аутентификация, БД, real-time) |
| **Сайт** | Веб-сайт проекта (хостинг на [[knm.pp.ua]]) |

---

## Стек технологий

| Компонент | Технология | Роль |
|-----------|------------|------|
| **Frontend** | HTML5, CSS3, Vanilla JS | UI, анимации, SPA-роутинг |
| **Runtime** | [[Electron]] | Кроссплатформенное десктопное приложение |
| **Backend** | **Supabase** (PostgreSQL + GoTrue) | BaaS — аутентификация, БД, real-time |
| **Launcher Engine** | `minecraft-launcher-core` | Генерация аргументов JVM, проверка ассетов |

---

## Архитектура

```
Renderer (Vanilla JS SPA)
    ↕ Electron IPC
Main Process (Node.js)
    ↕ minecraft-launcher-core → JVM (Minecraft)
    ↕ Supabase Client → Cloud (auth + DB + real-time)
```

- **SPA-роутинг:** динамическое переключение страниц (`#page-home`, `#page-friends`, `#page-settings`) без перезагрузки
- **Supabase:** JWT-аутентификация, PostgreSQL, real-time статусы друзей
- **Manifest Sync:** `gen.js` → `manifest.json` → выборочное скачивание изменений

---

## Решённые проблемы

| Проблема | Решение |
|----------|---------|
| Дублирование RAM Slider (конфликт ID) | Зачистка устаревших контейнеров, единый блок |
| Хардкод никнейма при сбое auth | Валидация `currentUser` — блокировка запуска |
| Краши FancyMenu без зависимостей | Внедрение `konkrete`, `melody`; правка `fancymenu.cfg` |

---

## Roadmap

- [ ] Динамические новости (таблица `news` в Supabase)
- [ ] Progress Bar скачивания (скорость + проценты)
- [ ] Автообновление лаунчера через GitHub Releases
- [ ] Чат между друзьями (Supabase Broadcast)

---

## Связанные заметки

- [[Nox Task Manager]] — проект автора на [[Electron]]
- [[SankWPI]] — основной проект автора
- [[KineticCraft Server|KineticCraft Server]] — техно-магическая сборка Minecraft от автора
- [[knm.pp.ua]] — персональный сайт (хостинг лаунчера)
- [[GitHub]] — репозиторий проекта
- [[Minecraft]] — целевая игра

---

#KineticLauncher #Minecraft #Electron #Supabase #Project
