import sqlite3
import datetime
import random

def create_rich_db():
    conn = sqlite3.connect('nox_backup.db')
    c = conn.cursor()
    
    # Drop and recreate for a clean test
    c.execute('DROP TABLE IF EXISTS tasks')
    c.execute('DROP TABLE IF EXISTS settings')
    c.execute('DROP TABLE IF EXISTS attachments')
    
    c.execute('''CREATE TABLE tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      description TEXT,
      is_completed INTEGER DEFAULT 0,
      priority TEXT DEFAULT 'low',
      start_date TEXT,
      deadline TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )''')
    
    c.execute('CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT)')
    c.execute('CREATE TABLE attachments (id INTEGER PRIMARY KEY AUTOINCREMENT, task_id INTEGER, filename TEXT, path TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)')

    # Generate tasks for the last 15 days and the next 15 days (centered on now)
    start_anchor = datetime.datetime.now() - datetime.timedelta(days=15)
    
    titles = [
        "Разработка модуля синхронизации", "Встреча с командой Nox", "Рефакторинг Dashboard", 
        "Подготовка отчета за Q1", "Исправление багов в Electron", "Изучение Google Drive API",
        "Обновление документации", "Тестирование UI/UX", "Покупка лицензии IDE",
        "Планирование задач на спринт", "Дизайн логотипа Nox", "Настройка CI/CD",
        "Оптимизация базы данных", "Проверка логов сервера", "Миграция на React 19"
    ]
    
    descriptions = [
        "Нужно проверить все IPC хендлеры и убедиться, что токены сохраняются.",
        "Обсудить планы по внедрению ИИ-ассистента в менеджер задач.",
        "Удалить лишние зависимости и перевести компоненты на функциональный стиль.",
        "Собрать статистику по выполненным задачам и подготовить PDF.",
        "Исправить проблему с редиректом на 127.0.0.1 в Windows.",
        "Добавить поддержку выбора папок для бэкапа.",
        "Описать все новые методы в README.md.",
        "Проверить адаптивность модального окна выбора папок.",
        "Заказать подписку на JetBrains или VS Code extensions.",
        "Распределить тикеты между участниками проекта.",
        "Создать векторный логотип в темных тонах.",
        "Настроить GitHub Actions для автоматической сборки билдов.",
        "Добавить индексы для ускорения поиска по заголовкам.",
        "Проанализировать ошибки 404 при запросах к API.",
        "Проверить совместимость с новыми хуками useEffect и useState."
    ]

    priorities = ["low", "medium", "high"]
    
    task_data = []
    
    # Create ~60 tasks for a denser timeline
    for i in range(60):
        day_offset = random.randint(0, 30) # span 30 days around current
        deadline_date = start_anchor + datetime.timedelta(days=day_offset)
        deadline_date = deadline_date.replace(hour=random.randint(9, 21), minute=random.choice([0, 15, 30, 45]))
        
        # Start date is 1-5 days before deadline
        start_date = deadline_date - datetime.timedelta(days=random.randint(1, 5))
        
        title = random.choice(titles) + f" #{i+1}"
        desc = random.choice(descriptions)
        priority = random.choice(priorities)
        is_completed = 1 if deadline_date < datetime.datetime.now() and random.random() > 0.3 else 0
        
        deadline_str = deadline_date.strftime('%Y-%m-%dT%H:%M')
        start_str = start_date.strftime('%Y-%m-%dT%H:%M')
        
        task_data.append((title, desc, is_completed, priority, start_str, deadline_str, deadline_str))

    c.executemany('''
        INSERT INTO tasks (title, description, is_completed, priority, start_date, deadline, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', task_data)
    
    conn.commit()
    conn.close()
    print("Timeline-ready rich database created: nox_backup.db (60 tasks with start dates generated)")

if __name__ == '__main__':
    create_rich_db()
