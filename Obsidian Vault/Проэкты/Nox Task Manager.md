# Nox Task Manager

**Статус:** `Активный`  
**Тип:** Десктопное приложение для продуктивности (Task Manager + Quiz)  
**Философия:** [[Deep Work]] — отказ от «парадокса продуктивности»

---

## Стек технологий

| Технология | Назначение |
|------------|------------|
| **Electron** | Фреймворк десктопного приложения (Main Process + Renderer) |
| **React 19** | Frontend (SPA, Renderer Process) |
| **Vite 8** | Сборщик и HMR |
| **SQLite** (better-sqlite3) | Локальная БД (ACID, без сетевых задержек) |
| **Google Drive API** | Cloud Sync (бекап БД через OAuth 2.0) |
| **NSIS** | Упаковка инсталлятора под Windows |
| **TypeScript** | Язык разработки |

---

## Архитектура

Классическая [[Electron]]-архитектура:

```
Main Process (Node.js)
    ↕ IPC (contextBridge)
Renderer Process (React 19 + Vite)

SQLite (tasks.db) ←→ Google Drive API (бекап)
```

- **Main Process** — жизненный цикл окна, системные вызовы, ФС, парсинг .md файлов
- **Renderer** — интерфейс в «песочнице» (безопасность)
- **contextBridge** — изоляция Renderer от Node.js (защита от XSS)
- **IPC** — связь между процессами

---

## Хранение данных

- **Локально:** SQLite (`tasks.db`) через `better-sqlite3`
- **Синхронизация:** Google Drive API (OAuth 2.0) — изолированная папка с копией БД
- **Контроль:** ручное управление бекапом/восстановлением

---

## Философия: Zen UI + Smart Ranking + Active Recall

- **Zen-UI:** минималистичный интерфейс, никакого визуального шума
- **Smart Ranking:** автоматическое ранжирование задач по критичности и прогрессу
- **Active Recall:** встроенный тест знаний по заметкам Obsidian

---

## Структура репозитория

```
/my-tasks
├── electron/          # Main process (main.cjs, preload.js)
│   ├── main.cjs
│   ├── preload.js
│   ├── quiz-parser.js    # Парсинг .md → вопросы
│   └── quiz-scheduler.js # Spaced Repetition
├── src/               # React (components, hooks, dashboard)
│   ├── components/
│   │   ├── TaskBoard/
│   │   ├── Quiz/
│   │   │   ├── QuizSession.tsx    # Основное окно теста
│   │   │   ├── QuizCard.tsx       # Карточка вопроса
│   │   │   ├── QuizResults.tsx    # Результаты
│   │   │   └── QuizSettings.tsx   # Выбор папок и настроек
│   │   └── ...
│   └── hooks/
│       ├── useQuiz.ts
│       └── useSpacedRepetition.ts
├── database.cjs       # SQLite CRUD
├── sync.cjs           # Google Drive API
└── tasks.db           # Локальное хранилище
```

---

## Модуль: Obsidian Quiz

Встроенный тест знаний по заметкам из хранилища.

### Как работает

```
Main Process:
  Читает .md файлы из папки Obsidian
  Парсит: заголовки / таблицы / **термины** / true-false утверждения
  Отправляет вопросы в Renderer через IPC

Renderer (React):
  Показывает карточки с вопросами (одна за другой)
  Принимает ответ (текст / да-нет / выбор)
  Отправляет результат обратно в Main Process

SQLite (quiz_results):
  Хранит: вопрос, ответ пользователя, правильно/нет, дата, кол-во повторов
  Spaced Repetition: вопросы с ошибками показываются чаще
```

### Типы вопросов (парсинг .md)

| Тип | Откуда | Пример |
|-----|--------|--------|
| **term** | `**жирный текст**` + определение | "Что такое KV Cache?" |
| **header** | `## Заголовок` + первый абзац | "Что описано в разделе?" |
| **table** | markdown таблицы | Сопоставление модель↔контекст |
| **code** | code blocks | "Что выведет этот код?" |
| **truefalse** | утверждения с "— это" | "PagedAttention — техника vLLM. Правда?" |

### Spaced Repetition

```
Алгоритм:
  Правильно с первого раза → показать через 3 дня
  Правильно со 2 раза     → показать через 1 день
  Ошибка                  → показать сегодня / завтра
  Правильно 3 раза подряд → модель усвоена, убрать из активных
```

### UI

- **Боковая панель:** кнопка "🧠 Quiz", счётчик вопросов на сегодня
- **Окно теста:** вопрос → поле ответа → кнопка "Проверить" → обратная связь
- **Настройки:** выбор папок для сканирования, кол-во вопросов за сессию
- **Статистика:** график правильных ответов по дням, слабые места

### Schema SQLite

```sql
CREATE TABLE IF NOT EXISTS quiz_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  user_answer TEXT,
  is_correct BOOLEAN,
  qtype TEXT DEFAULT 'term',
  source TEXT,
  asked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  next_review DATETIME,
  repetitions INTEGER DEFAULT 0,
  correct_streak INTEGER DEFAULT 0
);

CREATE INDEX idx_quiz_review ON quiz_results(next_review);
```

### IPC API

```typescript
// Main Process → Renderer
interface QuizAPI {
  scanNotes(path: string): Promise<Question[]>;
  getTodayQuestions(): Promise<Question[]>;
  submitAnswer(questionId: number, answer: string): Promise<{ correct: boolean; correctAnswer: string }>;
  getStats(): Promise<QuizStats>;
}
```

---

## Проброс папки Obsidian через OpenVPN

Для доступа Nox к заметкам на удалённой машине (сервер / второй ПК).

### Схема

```
Локальный ПК (Nox)
    ↓ OpenVPN-клиент
Интернет (VPN-туннель)
    ↓ OpenVPN-сервер
Удалённая машина (Obsidian Vault)
    ↓ SMB / SSHFS / WebDAV
Монтирование папки с заметками
```

### Вариант 1: OpenVPN + SMB (Windows → Windows)

**На удалённой машине (сервер):**

```powershell
# 1. Установить OpenVPN Server (Community)
#    https://openvpn.net/community-downloads/

# 2. Расшарить папку Obsidian
New-Item -ItemType Directory -Path "C:\Users\stts0\Obsidian Vault" -Force
# ПКМ → Свойства → Доступ → Общий доступ
# Добавить пользователя или "Все", уровень "Чтение и запись"
```

**На локальном ПК (клиент):**

```powershell
# 1. Установить OpenVPN Client + импортировать .ovpn конфиг

# 2. Подключиться к VPN

# 3. Смонтировать сетевую папку
net use V: \\192.168.100.x\ObsidianVault /persistent:yes

# 4. В Nox указать путь: V:\
```

**Конфиг сервера (server.ovpn):**

```ini
port 1194
proto udp
dev tun
server 10.8.0.0 255.255.255.0
push "route 192.168.1.0 255.255.255.0"
push "dhcp-option DNS 8.8.8.8"
duplicate-cn
keepalive 10 120
cipher AES-256-GCM
auth SHA256
user nobody
group nobody
persist-key
persist-tun
status openvpn-status.log
verb 3
```

**Конфиг клиента (client.ovpn):**

```ini
client
dev tun
proto udp
remote ваш-сервер.duckdns.org 1194
resolv-retry infinite
nobind
persist-key
persist-tun
remote-cert-tls server
cipher AES-256-GCM
auth SHA256
key-direction 1
<ca>
# Вставить CA сертификат
</ca>
<cert>
# Вставить клиентский сертификат
</cert>
<key>
# Вставить ключ клиента
</key>
```

**Генерация сертификатов (EasyRSA):**

```powershell
# На сервере
git clone https://github.com/OpenVPN/easy-rsa.git
cd easy-rsa/easyrsa3
.\easyrsa init-pki
.\easyrsa build-ca nopass
.\easyrsa gen-req server nopass
.\easyrsa sign-req server server
.\easyrsa gen-dh
.\easyrsa gen-req client1 nopass
.\easyrsa sign-req client client1
# Копировать .crt и .key на клиент
```

### Вариант 2: SSHFS (Windows → Linux)

Если удалённая машина на Linux — быстрее и проще SMB.

**Сервер (Linux):**

```bash
# Установить OpenVPN
apt install openvpn

# Создать конфиг (аналогично Windows)
# Расшарить папку не нужно — SSHFS работает через SSH
```

**Клиент (Windows):**

```powershell
# 1. Подключиться к OpenVPN
# 2. Установить SSHFS-Win (https://github.com/billziss-gh/sshfs-win)
# 3. Смонтировать папку
net use V: \\sshfs\user@10.8.0.2\home\user\ObsidianVault
# 4. В Nox указать путь: V:\
```

### Вариант 3: WebDAV (любая ОС → любая)

```bash
# На сервере: nginx + WebDAV
apt install nginx-light
# Настроить location с WebDAV директивой

# На клиенте: смонтировать как сетевой диск
# Панель управления → Сетевое окружение → Добавить элемент
# Адрес: https://ваш-сервер/webdav/
```

### Настройка Nox для удалённой папки

В Nox добавить поле настройки:

```typescript
// src/components/Quiz/QuizSettings.tsx
interface QuizSettings {
  vaultPath: string;           // Локальный или сетевой путь
  useRemote: boolean;          // Включить VPN-режим
  remotePath: string;          // \\server\share\
  checkConnection: () => boolean; // Проверить доступность
}
```

Main Process проверяет доступность пути при старте:

```typescript
// electron/main.cjs
const fs = require('fs');

function checkVaultPath(path) {
  try {
    return fs.existsSync(path);
  } catch {
    return false;
  }
}

// Если путь недоступен — показать предупреждение
// и предложить подключиться к VPN
```

### Чек-лист подключения

- [ ] OpenVPN-сервер установлен и настроен
- [ ] Порт 1194 (UDP) открыт на роутере / фаерволе
- [ ] DDNS настроен (duckdns.org / no-ip), если IP динамический
- [ ] Клиентский .ovpn импортирован
- [ ] VPN-подключение установлено (ping 10.8.0.1)
- [ ] Сетевая папка смонтирована (net use)
- [ ] Nox видит файлы по сетевому пути

---

## Связанные заметки

- [[SankWPI]] — другой проект автора (Windows Post-Install Wizard)
- [[Kinetic Launcher|Kinetic Launcher]] — ещё один проект автора на [[Electron]]
- [[KineticCraft Server|KineticCraft Server]] — техно-магическая сборка Minecraft
- [[knm.pp.ua]] — персональный сайт / облачная инфраструктура
- [[../Задумки/Обновление NOX..]] — идеи по доработке Nox
- [[GitHub]] — репозиторий проекта
- [[React]] — фронтенд-фреймворк
- [[SQLite]] — база данных

---

#Nox #Project #Electron #React #SQLite #Productivity #TypeScript
