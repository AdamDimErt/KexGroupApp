# NotebookLM — Инструкции для разработки

> Используй `notebooklm` CLI при разработке интеграций с iiko и 1С.
> Это позволяет не гуглить документацию вручную — вся информация уже загружена в ноутбуки.

---

## Доступные ноутбуки

| ID | Название | Для каких этапов |
|----|----------|-----------------|
| `ccf3cb0b-7297-4823-b318-076d2b98ce68` | **Syrve and iiko POS API Documentation and SDK Reference** | Этап 3 (iiko интеграция) |
| `ea3c975a-5c18-4b52-93d0-cb446ecca184` | **1C:Enterprise OData Integration and Metadata Naming Guide** | Этап 3 (1С интеграция) |
| `7ae5179b-11e9-47eb-b74c-d21fb22b108b` | **Извлечение кадровых данных и показателей расчёта в 1С:ЗУП 3.1** | Этап 3 (1С расширенные данные) |

---

## Этап 3: Aggregator Worker — Что и откуда брать

### 🔴 iiko интеграция

**Ноутбук:** `ccf3cb0b-7297-4823-b318-076d2b98ce68`

#### Что нужно узнать перед реализацией:

```bash
# 1. Авторизация в iikoCloud API
notebooklm chat -n ccf3cb0b-7297-4823-b318-076d2b98ce68 \
  "Как выполняется авторизация в iikoCloud API? Какой endpoint, какие параметры, как хранить токен и когда он истекает?"

# 2. Получение списка ресторанов
notebooklm chat -n ccf3cb0b-7297-4823-b318-076d2b98ce68 \
  "Как получить список всех организаций/ресторанов через iikoCloud API? Какой endpoint и структура ответа?"

# 3. Получение продаж за бизнес-день
notebooklm chat -n ccf3cb0b-7297-4823-b318-076d2b98ce68 \
  "Какой endpoint iikoCloud API возвращает данные о продажах (выручке) за конкретный бизнес-день? Структура запроса и ответа?"

# 4. Получение данных по кассовым сменам
notebooklm chat -n ccf3cb0b-7297-4823-b318-076d2b98ce68 \
  "Как получить данные по кассовым сменам (открытие/закрытие, сумма продаж) через iikoCloud API?"

# 5. Rate limits и ограничения
notebooklm chat -n ccf3cb0b-7297-4823-b318-076d2b98ce68 \
  "Есть ли rate limits в iikoCloud API? Какие ограничения по количеству запросов?"
```

#### Данные которые нужно получать из iiko (для FinancialSnapshot):
| Поле | iiko endpoint | Описание |
|------|--------------|----------|
| `revenue_today` | `/api/1/reports/...` | Выручка за текущий бизнес-день |
| `revenue_month` | `/api/1/reports/...` | Выручка за текущий месяц |
| `orders_count` | `/api/1/reports/...` | Количество заказов за день |
| `avg_check` | вычисляется | revenue_today / orders_count |
| `shift_open` | `/api/1/cash_shifts` | Статус кассовой смены |
| `iiko_restaurant_id` | `/api/1/organizations` | ID ресторана в iiko для маппинга |

---

### 🔵 1С интеграция

**Ноутбуки:**
- `ea3c975a-5c18-4b52-93d0-cb446ecca184` — OData интерфейс, REST API
- `7ae5179b-11e9-47eb-b74c-d21fb22b108b` — Данные расчётов и показателей

#### Что нужно узнать перед реализацией:

```bash
# 1. Базовый URL и аутентификация OData
notebooklm chat -n ea3c975a-5c18-4b52-93d0-cb446ecca184 \
  "Как подключиться к 1С через OData REST API? Базовый URL, аутентификация Basic Auth, формат запросов?"

# 2. Получение расходов
notebooklm chat -n ea3c975a-5c18-4b52-93d0-cb446ecca184 \
  "Как получить данные о расходах (затратах) организации через OData 1С? Какие объекты метаданных использовать?"

# 3. Остатки на счетах
notebooklm chat -n ea3c975a-5c18-4b52-93d0-cb446ecca184 \
  "Как получить остатки на расчётных счетах и кассе через OData интерфейс 1С? Регистры накопления или бухгалтерии?"

# 4. Фильтрация по дате и организации
notebooklm chat -n ea3c975a-5c18-4b52-93d0-cb446ecca184 \
  "Как в OData запросе к 1С фильтровать данные по дате и по конкретной организации? Синтаксис $filter?"

# 5. Названия объектов метаданных
notebooklm chat -n ea3c975a-5c18-4b52-93d0-cb446ecca184 \
  "Как формируются имена объектов метаданных в URL OData запросов 1С? Например Document_ПлатёжноеПоручение?"

# 6. Зарплата и кадры (если нужно)
notebooklm chat -n 7ae5179b-11e9-47eb-b74c-d21fb22b108b \
  "Как получить данные о начисленной зарплате сотрудников за период через 1С:ЗУП?"
```

#### Данные которые нужно получать из 1С (для FinancialSnapshot):
| Поле | 1С объект | Описание |
|------|----------|----------|
| `expenses_today` | `Document_РасходныйКассовыйОрдер` | Расходы за день |
| `expenses_month` | Регистр бухгалтерии | Расходы за месяц |
| `cash_balance` | `AccumulationRegister_ДенежныеСредства` | Остаток наличных |
| `bank_balance` | `AccumulationRegister_ДенежныеСредстваБезналичные` | Остаток на счёте |
| `salary_accrued` | `AccumulationRegister_Начисления` | Начисленная зарплата |
| `onec_org_id` | `Catalog_Организации` | ID организации в 1С для маппинга |

---

## Как использовать во время разработки

### Сценарий 1: Начало работы над HTTP-клиентом для iiko

```bash
# Получи полный список endpoints которые нам нужны
notebooklm chat -n ccf3cb0b-7297-4823-b318-076d2b98ce68 \
  "Составь список всех REST API endpoints iikoCloud которые нужны для получения: авторизации, списка организаций, продаж за день, кассовых смен. Для каждого укажи: метод HTTP, URL, параметры запроса, структуру ответа."
```

### Сценарий 2: Написание TypeScript типов для ответов iiko

```bash
notebooklm chat -n ccf3cb0b-7297-4823-b318-076d2b98ce68 \
  "Какая структура JSON ответа от iikoCloud API для endpoint получения выручки за бизнес-день? Приведи пример ответа чтобы я мог написать TypeScript типы."
```

### Сценарий 3: Отладка OData запроса к 1С

```bash
notebooklm chat -n ea3c975a-5c18-4b52-93d0-cb446ecca184 \
  "Почему OData запрос к 1С возвращает ошибку 400? Я делаю GET /odata/standard.odata/Document_ПлатёжноеПоручение?$filter=Дата gt datetime'2026-01-01T00:00:00'"
```

### Сценарий 4: Ошибки авторизации iiko

```bash
notebooklm chat -n ccf3cb0b-7297-4823-b318-076d2b98ce68 \
  "iikoCloud API возвращает 401 Unauthorized. Как правильно передавать токен в заголовках? Нужно ли его обновлять и как часто?"
```

---

## Автоматическое создание блокнотов для новых доменов

Когда researcher-агент исследует новый домен (не iiko/1C), он должен:

```bash
# 1. Создать блокнот
notebooklm create "KEX: [Название домена]"

# 2. Добавить все релевантные источники
notebooklm source add "https://official-docs.com/api"
notebooklm source add ./research/domain-notes.md
notebooklm source add ./CLAUDE.md  # контекст проекта
notebooklm source add "Текстовые заметки и выводы..." --title "Research Notes"

# 3. Дождаться индексации
notebooklm source wait

# 4. Задать вопросы и сгенерировать отчёт
notebooklm ask "Ключевой вопрос по домену"
notebooklm generate report

# 5. Экспортировать для команды
notebooklm metadata > .planning/research/notebook-export.json
```

### Мастер-блокнот проекта

Для полного аудита можно создать мастер-блокнот со всеми источниками:

```bash
notebooklm create "KEX GROUP — Полная база знаний"

# Добавить все исследования
notebooklm source add ./CLAUDE.md
notebooklm source add ./research/iiko-api.md
notebooklm source add ./research/1c-odata.md
notebooklm source add ./packages/database/schema.prisma --title "Database Schema"
notebooklm source add "https://api-ru.iiko.services/api/1/" --title "iiko API Base"

notebooklm source wait
notebooklm ask "Составь полную карту интеграций проекта KEX GROUP"
```

## Правила использования в GSD

- **Researcher-агенты ОБЯЗАНЫ** проверять NotebookLM ПЕРЕД Context7/WebSearch
- **Перед планированием Этапа 3** — обязательно сделать запросы к ноутбукам для понимания структуры API
- **Перед написанием TypeScript типов** — запросить примеры JSON ответов
- **При ошибках интеграции** — сначала спросить в ноутбуке, потом гуглить
- **При добавлении новых полей в FinancialSnapshot** — проверить в ноутбуке наличие нужных endpoints
- **При создании нового домена** — создать блокнот, загрузить источники, верифицировать через него

---

## Быстрые команды

```bash
# Открыть список всех ноутбуков
notebooklm list

# Задать вопрос по iiko
notebooklm chat -n ccf3cb0b-7297-4823-b318-076d2b98ce68 "твой вопрос"

# Задать вопрос по 1С OData
notebooklm chat -n ea3c975a-5c18-4b52-93d0-cb446ecca184 "твой вопрос"

# Задать вопрос по 1С:ЗУП данным
notebooklm chat -n 7ae5179b-11e9-47eb-b74c-d21fb22b108b "твой вопрос"
```
