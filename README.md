# Price Parser

Персональный сервис для регулярного мониторинга и сохранения истории цен на маркетплейсах (на данный момент реализована поддержка Ozon).

## Стек

- **Runtime:** Node.js, TypeScript

- **HTTP / API:** Fastify, Swagger UI

- **Scraping:** Playwright (Chromium с персистентной сессией)

- **Database:** PostgreSQL, Drizzle ORM

- **Queue / Scheduler:** Redis, BullMQ

## Что умеет сервис

- Принимает ссылку или артикул (SKU) товара Ozon через HTTP API

- В фоновом режиме через очередь парсит минимальную реальную цену и статус наличия

- Сохраняет историю изменения цен в PostgreSQL

- Периодически обновляет цены по расписанию и по ручному триггеру

- Предоставляет интерактивную документацию Swagger UI для тестирования всех эндпоинтов

## Установка и запуск

### 1. Подготовка окружения

Создайте файл `.env` в корне проекта со следующими переменными:

SERVER_PORT=3000  
POSTGRES_DB=price_parser  
POSTGRES_USER=postgres  
POSTGRES_PASSWORD=postgres  
POSTGRES_URL=postgresql://postgres:postgres@127.0.0.1:5432/price_parser  
REDIS_HOST=127.0.0.1  
REDIS_PORT=6379  
PARSER_CRON_PATTERN="0 */6 * * *"

### 2. Запуск инфраструктуры

Поднимите базы данных PostgreSQL и Redis в Docker:

docker compose up -d

### 3. Установка зависимостей и миграция БД

npm install
npm run db:push

### 4. Запуск сервиса

npm run dev

Сервер запустится по адресу: http://localhost:3000

### Документация API (Swagger)

Интерактивная документация со всеми маршрутами доступна в браузере по адресу:
http://localhost:3000/docs

---

# Roadmap

## Клиент

- Веб-интерфейс для отслеживания динамики цен и добавления товаров

## Остальные маркетплейсы

- Wildberries

- Yandex Market

- Avito
