# Obsidian Quiz

> **Статус:** Влит в [[Nox Task Manager]] как модуль Quiz  
> Отдельная реализация — Python CLI скрипт (см. ниже). Основная разработка — в Nox (Electron + React).

## Идея

Сканирует `.md` файлы в хранилище, парсит их и задаёт вопросы по содержанию.

### Типы вопросов

| Тип | Откуда берётся | Пример |
|-----|---------------|--------|
| **Термин** | `**жирный текст**` — определение рядом | "Что такое KV Cache?" |
| **Заголовок → вопрос** | `## Название` → превращаем в вопрос | "Что описывается в разделе Flash Attention?" |
| **Таблица → вопрос** | Из таблиц берутся строки | "Сколько токенов у GPT-5.5?" |
| **Код → вопрос** | Из code blocks | "Что выведет этот код?" |
| **True/False** | Утверждение из текста | "GQA — это Grouped-Query Attention. Правда?" |
| **Сопоставление** | Две колонки из таблицы | "Сопоставь модель и размер контекста" |
| **Пропущенное слово** | Предложение с пропуском | "Attention(Q,K,V) = softmax(???) · V" |

## Установка

```bash
pip install -r requirements.txt
```

requirements.txt:
```
pathspec>=0.12
```

## Код

```python
#!/usr/bin/env python3
"""Obsidian Quiz — тестирование знаний по заметкам."""

import os
import re
import random
import sys
from pathlib import Path
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass, field


# ═══════════════════════════════════════════════════
# Модели данных
# ═══════════════════════════════════════════════════

@dataclass
class Question:
    question: str
    answer: str
    source: str  # файл-источник
    qtype: str   # term / table / header / code / truefalse / fill

    def check(self, user_answer: str) -> bool:
        """Проверка ответа (регистронезависимая, по ключевым словам)."""
        ua = user_answer.strip().lower()
        if not ua:
            return False
        # Точное совпадение
        if ua == self.answer.lower().strip():
            return True
        # True/False
        if self.qtype == 'truefalse':
            return ua in ('да', 'true', 'yes', '1') if self.answer.lower() == 'да' else \
                   ua in ('нет', 'false', 'no', '0')
        # Для терминов — проверяем ключевые слова
        keywords = [w for w in self.answer.lower().split() if len(w) > 3][:3]
        if keywords and all(kw in ua for kw in keywords):
            return True
        # Для коротких ответов — нечеткое совпадение
        return False


@dataclass
class QuizResult:
    total: int = 0
    correct: int = 0
    wrong: List[Tuple[Question, str]] = field(default_factory=list)

    @property
    def percent(self) -> float:
        return (self.correct / self.total * 100) if self.total else 0


# ═══════════════════════════════════════════════════
# Парсер markdown
# ═══════════════════════════════════════════════════

def parse_md(filepath: Path) -> List[Question]:
    """Парсит .md файл и возвращает список вопросов."""
    text = filepath.read_text(encoding='utf-8')
    questions: List[Question] = []
    source = str(filepath)

    lines = text.split('\n')
    i = 0
    current_header = ''
    in_code_block = False
    code_buffer = []
    table_buffer = []

    while i < len(lines):
        line = lines[i]

        # Пропускаем code blocks (не генерируем из них вопросы)
        if line.strip().startswith('```'):
            if in_code_block:
                # Извлекаем вопрос из code block
                if len(code_buffer) >= 3:
                    q = make_code_question(code_buffer, source)
                    if q:
                        questions.append(q)
                code_buffer = []
                in_code_block = False
            else:
                in_code_block = True
                code_buffer = []
            i += 1
            continue

        if in_code_block:
            code_buffer.append(line)
            i += 1
            continue

        # Заголовки
        header_match = re.match(r'^(#{1,6})\s+(.+)$', line)
        if header_match:
            level = len(header_match.group(1))
            title = header_match.group(2).strip()
            # Убираем ссылки из заголовка
            title = re.sub(r'\[\[([^\]]+)\]\]', r'\1', title)
            if level >= 2 and len(title) > 4:
                current_header = title
                # Вопрос из заголовка
                next_line = lines[i + 1].strip() if i + 1 < len(lines) else ''
                if next_line and not next_line.startswith('#'):
                    questions.append(Question(
                        question=f"Что описано в разделе «{title}»?",
                        answer=summarize_section(lines, i),
                        source=source, qtype='header'
                    ))
            i += 1
            continue

        # Жирный текст — термин с определением
        bold_matches = re.finditer(r'\*\*([^*]+)\*\*', line)
        for m in bold_matches:
            term = m.group(1)
            if len(term) > 2 and '--' not in term:
                context = line[m.end():].strip()
                # Берем текст до конца предложения как определение
                def_match = re.match(r'^[—\-–]\s*(.+?)[.!?]?\s*(?:\||\[|$)', context)
                if def_match:
                    definition = def_match.group(1).strip()
                    if len(definition) > 10:
                        questions.append(Question(
                            question=f"Что такое «{term}»?",
                            answer=definition,
                            source=source, qtype='term'
                        ))

        # Таблицы
        if '|' in line and line.strip().startswith('|') and lines[i + 1].strip().startswith('|---'):
            table_buffer = []
            while i < len(lines) and lines[i].strip().startswith('|'):
                table_buffer.append(lines[i])
                i += 1
            questions.extend(make_table_questions(table_buffer, source, current_header))
            continue

        # True/False из утверждений (слова "это", "является")
        tf_match = re.search(r'(—|–)\s*(.+?)(\.|!)?$', line)
        if tf_match and len(tf_match.group(2)) > 15:
            statement = tf_match.group(2).strip()
            questions.append(Question(
                question=statement + "\nПравда или ложь?",
                answer="Да",
                source=source, qtype='truefalse'
            ))

        i += 1

    return questions


def summarize_section(lines: List[str], header_idx: int) -> str:
    """Извлекает первое осмысленное предложение после заголовка."""
    for j in range(header_idx + 1, min(header_idx + 10, len(lines))):
        line = lines[j].strip()
        if line and not line.startswith('#') and not line.startswith('```') and not line.startswith('|'):
            # Берем первое предложение
            sent = re.split(r'[.?!]', line)[0].strip()
            # Ограничиваем длину
            if len(sent) > 150:
                sent = sent[:147] + '...'
            return sent if sent else line
    return "Смотри раздел в заметке"


def make_code_question(code_lines: List[str], source: str) -> Optional[Question]:
    """Создает вопрос по коду."""
    code = '\n'.join(code_lines[:10])  # не больше 10 строк
    if len(code) < 10:
        return None
    # Пытаемся найти вызов функции или присваивание
    call_match = re.search(r'(print|return|console\.log|System\.out)\s*[\( ](.+?)[\)]', code)
    if call_match:
        return Question(
            question=f"Что выведет этот код?\n```\n{code}\n```",
            answer=call_match.group(2).strip(),
            source=source, qtype='code'
        )
    return None


def make_table_questions(table_lines: List[str], source: str, header: str) -> List[Question]:
    """Извлекает вопросы из markdown-таблицы."""
    questions = []
    if len(table_lines) < 3:
        return questions

    # Парсим заголовки
    headers = [h.strip() for h in table_lines[0].strip('|').split('|')]
    rows = []
    for line in table_lines[2:]:
        cells = [c.strip() for c in line.strip('|').split('|')]
        if len(cells) == len(headers):
            rows.append(cells)

    if len(rows) < 2:
        return questions

    # Ищем пары колонок: если есть колонка с названиями (Тема, Модель, Продукт)
    name_col = -1
    value_col = -1
    for i, h in enumerate(headers):
        hl = h.lower()
        if any(w in hl for w in ['модель', 'продукт', 'тема', 'метод', 'язык', 'тип', 'инструмент', 'техника']):
            name_col = i
        if any(w in hl for w in ['описание', 'значение', 'решение', 'особенности', 'сильные стороны', 'норма']):
            value_col = i

    if name_col >= 0 and value_col >= 0:
        for row in rows[:8]:  # не больше 8 вопросов из таблицы
            term = row[name_col]
            value = row[value_col]
            if len(term) > 1 and len(value) > 3:
                questions.append(Question(
                    question=f"Что такое «{term}»?",
                    answer=value,
                    source=source, qtype='table'
                ))

    # Если три колонки — вопрос по первой, ответ из последней
    if len(headers) == 3 and name_col >= 0:
        last_col = len(headers) - 1
        for row in rows[:8]:
            term = row[name_col]
            value = row[last_col]
            if len(term) > 1 and len(value) > 3:
                questions.append(Question(
                    question=f"Какая характеристика у «{term}»?",
                    answer=value,
                    source=source, qtype='table'
                ))

    return questions


# ═══════════════════════════════════════════════════
# Сканер хранилища
# ═══════════════════════════════════════════════════

IGNORE_DIRS = {'.obsidian', '.git', '__pycache__', 'node_modules', '.trash'}

def scan_vault(vault_path: str, max_files: int = 50) -> List[Path]:
    """Сканирует хранилище и возвращает список .md файлов."""
    path = Path(vault_path)
    if not path.exists():
        print(f"❌ Путь не найден: {vault_path}")
        return []

    files = []
    for md_file in path.rglob('*.md'):
        rel = md_file.relative_to(path)
        parts = rel.parts
        if any(part in IGNORE_DIRS for part in parts):
            continue
        files.append(md_file)
        if len(files) >= max_files:
            break

    return sorted(files)


# ═══════════════════════════════════════════════════
# CLI интерфейс
# ═══════════════════════════════════════════════════

def run_quiz(questions: List[Question], num_questions: int = 10, shuffle: bool = True):
    """Запускает викторину."""
    if not questions:
        print("❌ Нет вопросов для викторины.")
        return

    if shuffle:
        random.shuffle(questions)

    selected = questions[:num_questions]
    result = QuizResult()

    print(f"\n{'═' * 50}")
    print(f"  🧠  Obsidian Quiz  —  {num_questions} вопросов")
    print(f"{'═' * 50}\n")

    for i, q in enumerate(selected, 1):
        result.total += 1
        print(f"\n{'─' * 40}")
        print(f"  Вопрос {i}/{num_questions} [{q.qtype.upper()}]:")
        print(f"{'─' * 40}")
        print(f"\n{q.question}\n")

        # Для табличных вопросов показываем источник
        if q.qtype in ('table', 'term'):
            print(f"  📁 {Path(q.source).name}")

        # Для True/False не показываем подсказку
        if q.qtype != 'truefalse':
            print(f"  💡 Источник: {q.source}")

        user_input = input("\n  Ваш ответ: ").strip()

        if not user_input:
            print("  ⏭  Пропущен")
            result.wrong.append((q, ''))
            print(f"  Правильный ответ: {q.answer}")
            continue

        if q.check(user_input):
            print("  ✅ Верно!")
            result.correct += 1
        else:
            print(f"  ❌ Неверно")
            result.wrong.append((q, user_input))
            print(f"  Правильный ответ: {q.answer}")

    # Результаты
    print(f"\n{'═' * 50}")
    print(f"  📊 Результат: {result.correct}/{result.total} ({result.percent:.0f}%)")
    print(f"{'═' * 50}")

    if result.percent >= 80:
        print("  🏆 Отлично! Ты знаешь материал.")
    elif result.percent >= 60:
        print("  👍 Хорошо! Есть куда расти.")
    elif result.percent >= 40:
        print("  📚 Средне. Почитай заметки ещё раз.")
    else:
        print("  🔄 Слабо. Открой заметки и повтори.")

    if result.wrong:
        print(f"\n  🔴 Нужно повторить ({len(result.wrong)}):")
        for q, ua in result.wrong[:5]:
            print(f"    • {q.question[:60]}...")
            print(f"      Правильно: {q.answer}")

    return result


def interactive_mode(vault_path: str):
    """Интерактивный режим: выбор папки, количества вопросов."""
    print(f"\n  🧠  Obsidian Quiz")
    print(f"  📁  {vault_path}")

    # Выбор папки
    folders = ['all', 'Исследования', 'Здоровье', 'Технологии', 'Formula 1', 'Проэкты']
    print("\n  Выбери раздел:")
    for i, folder in enumerate(folders, 1):
        print(f"    {i}. {folder}")
    print(f"    {len(folders)+1}. Свой путь")

    try:
        choice = int(input("\n  Номер: "))
    except ValueError:
        choice = 1

    if 1 <= choice <= len(folders):
        target = vault_path
        if folders[choice-1] != 'all':
            target = os.path.join(vault_path, folders[choice-1])
    else:
        target = input("  Путь к папке: ").strip()

    # Количество вопросов
    try:
        num = int(input("\n  Сколько вопросов? (по умолч. 10): ") or "10")
    except ValueError:
        num = 10

    # Сканируем и парсим
    print("\n  🔍 Сканирую заметки...")
    files = scan_vault(target, max_files=100)
    if not files:
        print("  ❌ Нет .md файлов в этой папке.")
        return

    print(f"  📄 Найдено файлов: {len(files)}")

    questions = []
    for file in files:
        try:
            qs = parse_md(file)
            questions.extend(qs)
        except Exception as e:
            print(f"  ⚠️  Ошибка в {file.name}: {e}")

    print(f"  ❓ Сгенерировано вопросов: {len(questions)}")

    if not questions:
        print("  ❌ Не удалось извлечь вопросы.")
        return

    run_quiz(questions, num)


# ═══════════════════════════════════════════════════
# Точка входа
# ═══════════════════════════════════════════════════

if __name__ == '__main__':
    vault = r"C:\Users\stts0\OneDrive\Документы\Obsidian Vault"

    if len(sys.argv) > 1:
        if sys.argv[1] == '--help':
            print("  Obsidian Quiz — тест знаний по заметкам")
            print("  Использование:")
            print("    python quiz.py             — интерактивный режим")
            print("    python quiz.py --all 20    — 20 вопросов по всему хранилищу")
            print("    python quiz.py --path D:\Vault — свой путь")
            sys.exit(0)
        elif sys.argv[1] == '--all':
            num = int(sys.argv[2]) if len(sys.argv) > 2 else 10
            files = scan_vault(vault, max_files=100)
            questions = []
            for file in files:
                questions.extend(parse_md(file))
            run_quiz(questions, num)
        elif sys.argv[1] == '--path' and len(sys.argv) > 2:
            vault = sys.argv[2]
            interactive_mode(vault)
        else:
            print("❌ Неизвестный аргумент. Используй --help")
    else:
        interactive_mode(vault)
```

## Как запускать

```powershell
# Сохранить скрипт как quiz.py
# Запустить:
python quiz.py

# Выбрать раздел → количество вопросов → отвечать
```

## Пример сессии

```
🧠  Obsidian Quiz
📁  C:\Users\stts0\OneDrive\Документы\Obsidian Vault

Выбери раздел:
  1. all
  2. Исследования
  3. Здоровье
  4. Технологии

Номер: 2

Сколько вопросов? (по умолч. 10): 10

🔍 Сканирую заметки...
📄 Найдено файлов: 25
❓ Сгенерировано вопросов: 47

────────────────────────────────────────
  Вопрос 1/10 [TERM]:
────────────────────────────────────────

Что такое «KV Cache»?

💡 Источник: Исследования\LLM\Инференс и оптимизация.md

  Ваш ответ: кэш матриц K и V
  ✅ Верно!
```

## Что улучшить

| Идея | Статус |
|------|--------|
| **Spaced Repetition** — запоминать ошибки, показывать чаще | 📝 |
| **LLM генерация** — использовать локальную LLM для вопросов | 📝 |
| **GUI** — простая веб-страница вместо CLI | 📝 |
| **Anki экспорт** — `.apkg` файл для Anki | 📝 |
| **Статистика** — график прогресса по дням | 📝 |

---

**Связанные заметки:** [[Здоровье/Челленджи]] — 30-дневный челлендж "повторение заметок"
