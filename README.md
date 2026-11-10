# Price Parser

Персональный сервис для регулярного мониторинга и сохранения истории цен на маркетплейсах (на данный момент реализована поддержка Ozon).

Монорепозиторий состоит из двух приложений в папке `apps/`:

- **`apps/server`** — бэкенд и воркер парсинга (Fastify, BullMQ, Playwright, Drizzle ORM, PostgreSQL, Redis).
- **`apps/client`** — фронтенд (Svelte 5, Vite).

## Стек

- **Backend:** Node.js, TypeScript, Fastify, Swagger UI, Playwright, BullMQ, Redis, PostgreSQL, Drizzle ORM
- **Frontend:** Svelte 5, Vite, TypeScript, Chart.js, Tinro

## Что умеет сервис

- Принимает ссылку или артикул (SKU) товара Ozon через HTTP API и веб-интерфейс
- В фоновом режиме через очередь парсит минимальную реальную цену и статус наличия
- Сохраняет историю изменения цен в PostgreSQL
- Периодически обновляет цены по расписанию и по ручному триггеру
- Предоставляет интерактивную документацию Swagger UI для тестирования всех эндпоинтов
- Отображает карточки товаров, графики динамики цен и форму добавления в веб-клиенте

## Установка и запуск

### 1. Подготовка окружения

Создайте файл `.env` в корне проекта (и при необходимости скопируйте в `apps/server/.env`):

```env
SERVER_PORT=3000
POSTGRES_DB=price_parser
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_URL=postgresql://postgres:postgres@127.0.0.1:5432/price_parser
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
PARSER_CRON_PATTERN="0 */6 * * *"
```

### 2. Запуск инфраструктуры

Поднимите базы данных PostgreSQL и Redis в Docker:

```bash
docker compose up -d
```

### 3. Установка зависимостей и миграция БД

```bash
npm install
npm run db:push
```

### 4. Запуск в режиме разработки

Запустить сервер и клиент одновременно:

```bash
npm run dev
```

Или запустить раздельно:

```bash
npm run dev:server  # Сервер: http://localhost:3000
npm run dev:client  # Клиент: http://localhost:5173
```

### Адреса сервисов

- Веб-клиент: http://localhost:5173
- Сервер API: http://localhost:3000
- Документация Swagger UI: http://localhost:3000/docs

### Сборка и проверка типов

```bash
npm run build      # Сборка бэкенда и фронтенда
npm run typecheck  # Проверка типов в обоих проектах
npm run format     # Форматирование кода (dprint)
```

---

## Roadmap

### Остальные маркетплейсы

- Wildberries
- Yandex Market
- Avito
