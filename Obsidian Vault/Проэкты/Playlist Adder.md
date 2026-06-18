# Playlist Adder

**Статус:** `Активный`  
**Тип:** Десктопное приложение для управления [[Spotify]]-плейлистами  
**Цель:** Массовый импорт треков из TXT-файлов в плейлисты Spotify

---

## Стек

| Компонент | Технология |
|-----------|------------|
| **API** | [[Spotify]] Web API (REST) |
| **Auth** | OAuth 2.0 (Authorization Code Flow) |
| **Redirect URI** | `http://127.0.0.1:8888/callback` |
| **Формат данных** | JSON |

---

## Алгоритм

1. Загрузка списка треков из `*.txt`
2. [[OAuth 2.0]] авторизация → Access Token
3. Поиск каждого трека через Spotify Search API
4. Получение [[Spotify]] URI трека
5. Добавление URI в плейлист (POST `/playlists/{id}/tracks`)
6. Отчёт о добавленных / пропущенных

---

## Scopes (разрешения)

| Scope | Назначение |
|-------|------------|
| `playlist-modify-public` | Изменение публичных плейлистов |
| `playlist-modify-private` | Изменение приватных плейлистов |

---

## Настройки приложения

| Параметр | Значение |
|----------|----------|
| App Name | Playlist Adder |
| Description | Batch track adder from local .txt files |
| Status | Development Mode |
| Redirect URI | `http://127.0.0.1:8888/callback` |

---

## Roadmap

- [x] Загрузка треков из TXT
- [x] Авторизация OAuth 2.0
- [x] Поиск и добавление через API
- [ ] Поддержка CSV / Excel
- [ ] GUI
- [ ] Проверка дубликатов
- [ ] Создание плейлистов через приложение
- [ ] Логи операций
- [ ] Кэширование поиска
- [ ] Несколько аккаунтов

---

## Связанные заметки

- [[SankWPI]] — автор проектов
- [[Технологии/OAuth 2.0]] — протокол авторизации
- [[knm.pp.ua]] — инфраструктура (возможный хостинг)

---

#PlaylistAdder #Spotify #API #OAuth #JavaScript
