# OAuth 2.0

**Тип:** Протокол авторизации  
**Стандарт:** [RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)

## Flow: Authorization Code

1. Пользователь → авторизация в сервисе
2. Сервис → Authorization Code (через Redirect URI)
3. Приложение обменивает код на **Access Token**
4. Access Token → запросы к API
5. **Refresh Token** — для получения нового Access Token без повторной авторизации

## Используется в проектах

- [[Playlist Adder]] — авторизация Spotify Web API
- [[Supabase]] — аутентификация пользователей (GoTrue)

## Термины

| Термин | Описание |
|--------|----------|
| **Access Token** | Временный ключ доступа к данным |
| **Refresh Token** | Токен для обновления Access Token |
| **Redirect URI** | Адрес возврата после авторизации |
| **Scope** | Набор запрашиваемых разрешений |
| **Client ID / Secret** | Идентификатор приложения |

#OAuth #Auth #Security
