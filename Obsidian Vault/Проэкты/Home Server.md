# Home Server

**Статус:** `Работает`  
**Тип:** Домашний сервер (виртуализация + NAS + игровой сервер)  
**Цель:** Хранение данных + хостинг сервисов + [[KineticCraft Server]]

---

## Железо

| Компонент | Модель | Характеристики |
|-----------|--------|----------------|
| Корпус | 4U Rackmount | Серверный корпус, полноразмерные платы |
| Процессор | Intel Core i3-2130 | 2 ядра / 4 потока, 3.4 GHz, Sandy Bridge, LGA1155 |
| Материнская плата | LGA1155 (H61 / B75) | 2×DIMM DDR3, SATA 3Gb/s, PCIe 2.0 |
| RAM | 4 GB DDR3 | 2×2 GB, PC3-10600 (1333 MHz) |
| SSD | 120 GB | SATA, система Proxmox |
| HDD #1 | 1 TB | SATA, ZFS Mirror |
| HDD #2 | 1 TB | SATA, ZFS Mirror |
| GPU | NVIDIA GTX 1050 Ti 4 GB | PCIe 3.0 x16, не используется (нет passthrough) |
| Сеть | Realtek / Intel | 1 Gbps, встроенная |

---

## Архитектура

```
Интернет
    ↓
Роутер — Keenetic (192.168.0.1)
    ↓ NAT / Port Forwarding
Proxmox VE 8.x (192.168.0.63)
    ├── vmbr0 (bridge, LAN)
    │
    ├── TrueNAS VM (192.168.0.172)
    │   ├── CPU: 1 ядро
    │   ├── RAM: 1 GB
    │   ├── HDD: ZFS Mirror (500+500 GB) — проброс через PCIe/диски
    │   ├── OS: TrueNAS SCALE (Debian)
    │   └── Сервисы:
    │       ├── SMB Share — \\192.168.0.172\Data
    │       └── SMB Share — \\192.168.0.172\Backup
    │
    ├── Ubuntu Server VM (192.168.0.X)
    │   ├── CPU: 1 ядро
    │   ├── RAM: 1 GB
    │   ├── Диск: 20 GB (на SSD)
    │   ├── OS: Ubuntu 22.04 / 24.04 LTS
    │   └── Сервисы:
    │       ├── Docker (контейнеры)
    │       ├── Nginx (реверс-прокси)
    │       ├── Доп. сервисы
    │       └── ...
    │
    └── Minecraft VM (192.168.100.133)
        ├── CPU: 1 ядро
        ├── RAM: 1 GB
        ├── Диск: 50 GB
        ├── OS: Debian / Ubuntu Server
        └── Сервисы:
            ├── Java + PaperMC (KineticCraft)
            └── Проброс порта: 178.90.81.165:25570 → 192.168.100.133:25565
```

## Пул ZFS (TrueNAS)

```
Пул: ss (mirror)
  ├── /dev/sda — 1 TB
  └── /dev/sdb — 1 TB

Ёмкость:
  Общая: 2 TB (raw)
  Доступно: ~1 TB (зеркало)
  Занято: ~X GB

Dataset:
  └── ss/Data — основное хранилище
      ├── SMB share: Data
      └── SMB share: Backup (бэкапы конфигов)

Сжатие: lz4 (включено)
Дедупликация: выключена
Snapshots: ежедневные, хранение 7 дней
```

## Proxmox Storage Layout

```
Локально (SSD 120 GB):
  ├── local (ISO templates)      — ~20 GB
  ├── local-lvm (VM disks)       — ~80 GB
  │   ├── VM 100: TrueNAS       — 4 GB (system)
  │   ├── VM 101: Ubuntu        — 20 GB
  │   └── VM 102: Minecraft     — 50 GB
  └── SWAP                       — ~4 GB

ZFS (HDD 500+500 GB, mirror):
  └── Проброшен в TrueNAS VM как virtio-диски
```

## Сеть

| Параметр | Значение |
|----------|----------|
| Роутер | Keenetic (192.168.0.1) |
| Proxmox VE | 192.168.0.63 (vmbr0) |
| TrueNAS VM | 192.168.0.172 |
| Ubuntu VM | 192.168.0.X |
| Minecraft VM | 192.168.100.133 |
| Внешний IP | 178.90.81.165 |
| DNS | 8.8.8.8, 1.1.1.1 |
| DHCP | Keenetic (назначены резервации по MAC) |

### Проброс портов (роутер Keenetic)

| Внешний порт | Внутренний адрес | Внутренний порт | Назначение |
|:------------:|:----------------:|:---------------:|------------|
| 25570 | 192.168.100.133 | 25565 | Minecraft KineticCraft |
| 8006 | 192.168.0.63 | 8006 | Proxmox Web UI (VPN only) |

## Использование ресурсов

```
Proxmox Host:
  CPU: i3-2130 — 2C/4T, 3.4 GHz, ~30-50% нагрузка (Minecraft пилит)
  RAM: 4 GB
    ├── Proxmox Host     — ~500 MB
    ├── VM TrueNAS       — 1 GB
    ├── VM Ubuntu        — 1 GB
    ├── VM Minecraft     — 1 GB
    └── Запас            — ~500 MB (критично мало!)
```

## Ограничения (известные)

| Проблема | Почему | Что делать |
|----------|--------|------------|
| **RAM 4 GB** | DDR3, 2 слота, максимум 16 GB | Апгрейд до 2×8 GB DDR3 |
| **CPU 2 ядра** | i3-2130 (Sandy Bridge) | Апгрейд до i7-2600/3770 (4C/8T, LGA1155) |
| **SSD 120 GB** | Заканчивается под ISO и VM | SSD 240+ GB или NVMe через переходник |
| **Нет ECC** | H61 + i3 не поддерживает | Для ZFS желателен ECC |
| **GTX 1050 Ti** | Не используется (нет passthrough) | Продать или использовать для кодинга видео |

---

## Команды управления

```bash
# Подключение к Proxmox по SSH
ssh root@192.168.0.63

# Статус кластера
pvesh get /cluster/status

# Список VM
qm list

# Статус ZFS
zpool status
zfs list

# Логи
tail -f /var/log/syslog | grep -E "qm|pve"
```

---

**Связанные заметки:**

- [[KineticCraft Server]] — Minecraft-сервер работает на ВМ
- [[knm.pp.ua]] — инфраструктурный узел
- [[Nox Task Manager]] — менеджер задач, интеграция с сервером
- [[Технологии/Proxmox]] — гипервизор
- [[Технологии/TrueNAS]] — NAS
- [[Технологии/ZFS]] — файловая система
- [[Технологии/Ubuntu]] — серверная ОС
- [[Технологии/Docker]] — контейнеризация
- [[Технологии/Nginx]] — веб-сервер
- [[../../Задумки/Обновление NOX..]] — планы по апгрейду
- [[Домашние ПК/Сервер]] — карточка сервера

#HomeServer #Proxmox #TrueNAS #Ubuntu #Minecraft #Infrastructure
