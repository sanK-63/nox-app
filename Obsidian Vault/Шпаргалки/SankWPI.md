# SankWPI — Шпаргалка

## Сборка .exe

```powershell
Import-Module (Join-Path $docs "WindowsPowerShell\Modules\ps2exe") -Force
Invoke-ps2exe -InputFile setup.ps1 `
              -OutputFile SankWPI.exe `
              -IconFile image.ico `
              -requireAdmin
```

## Структура `Мечтания/`

```
Мечтания/
├── setup.ps1       # XAML + логика + встроенный JSON
├── config.json     # внешний конфиг (перекрывает встроенный)
├── SankWPI.exe     # готовая сборка
└── image.ico       # иконка
```

## Типы установки

| Тип | Механизм |
|-----|----------|
| `winget` | `winget install <id>` |
| `custom_download` | `Invoke-WebRequest` + тихий запуск |
| `custom_download_manual` | открыть браузер |
| `tweak` | правка реестра |

## Дизайн: Nox Light

| Элемент | Цвет |
|---------|------|
| Фон | `#ffffff` |
| Поверхности | `#f8f9fa` |
| Границы | `#e5e7eb` |
| Акцент | `#111111` |
| Muted | `#6b7280` |
| Размер | 420×540 |

#Cheatsheet #SankWPI #PowerShell
