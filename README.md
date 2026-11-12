# PRICE PARSER

Персональный сервис для регулярного автоматического мониторинга и сохранения истории цен на маркетплейсах (на данный момент реализована поддержка Ozon).

Монорепозиторий состоит из двух приложений и общего пакета типов:

- **`apps/server`** — бэкенд
- **`apps/client`** — фронтенд
- **`packages/types`** — общие TypeScript-типы для API и моделей данных.

---

## Стек

- **Backend:** Node.js 20+, TypeScript, Fastify, Swagger UI, Playwright, BullMQ, Redis, PostgreSQL, Drizzle ORM.
- **Frontend:** Svelte 5, TypeScript, Chart.js
- **Инфраструктура:** Docker, Docker Compose, Nginx

---

## Возможности сервиса

- **Управление товарами:**
  - Добавление товара по ссылке или артикулу (SKU) Ozon.
  - Редактирование названий товаров.
  - Управление статусом: постановка на паузу и возобновление мониторинга.
  - Удаление товара вместе со всей накопленной историей замеров.

---

## Установка и запуск

### 1. Настройка окружения

В проекте используется **один единый файл `.env` в корне репозитория**. Скопируйте шаблон:

```bash
cp .env.example .env
```

Основные переменные:

```env
# Клиент и Сервер
CLIENT_PORT=5173
SERVER_PORT=3000
SERVER_HOST=0.0.0.0

# База данных PostgreSQL
POSTGRES_DB=price_parser
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_URL=postgresql://postgres:postgres@127.0.0.1:5432/price_parser

# Очереди Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# Настройки парсера
PARSER_CRON_PATTERN="0 */6 * * *"
PARSER_BASE_DELAY_MS=3500
PARSER_SPREAD_DELAY_MS=1000
PARSER_HEADLESS=true
OZON_COOKIES=./profiles/ozon.json
OZON_PROFILE_DIR=./profiles/ozon_browser
```

---

### 2. Авторизация на Ozon

Парсер работает в фоновом режиме через файл кук:

1. Откройте в браузере [ozon.ru](https://www.ozon.ru) и авторизуйтесь в своем аккаунте.
2. С помощью расширения **Cookie-Editor** ([Firefox](https://addons.mozilla.org/en-US/firefox/addon/cookie-editor/), [Chromium](https://chromewebstore.google.com/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm)) нажмите **Export** -> **JSON**.
3. Сохраните полученный JSON в файл:
   ```text
   profiles/ozon.json
   ```
4. Проверьте авторизацию командой:
   ```bash
   npm run check:auth
   ```

---

### 3. Вариант А: Запуск в Docker (Рекомендуемый)

```bash
docker compose up --build -d
```

- **Веб-клиент:** [http://localhost:5173](http://localhost:5173)
- **API Swagger UI:** [http://localhost:5173/docs](http://localhost:5173/docs) (или [http://localhost:3000/docs](http://localhost:3000/docs))

---

### 4. Вариант Б: Локальный запуск для разработки

1. Поднимите PostgreSQL и Redis в Docker:
   ```bash
   docker compose up -d database redis
   ```
2. Установите зависимости и примените схему БД:
   ```bash
   npm install
   npm run db:push
   ```
3. Запустите клиент и сервер одновременно:
   ```bash
   npm run dev
   ```
   Или по отдельности:
   ```bash
   npm run dev:server  # Сервер: http://localhost:3000
   npm run dev:client  # Клиент: http://localhost:5173
   ```

---

## Полезные команды

```bash
npm run check:auth   # Проверка валидности кук Ozon со скриншотом в profiles/auth_check.png
npm run typecheck    # Проверка типов TypeScript (сервер + клиент)
npm run build        # Сборка всех пакетов монорепозитория
npm run format       # Форматирование кода (dprint)
npm run db:push      # Применение схемы Drizzle к базе данных
npm run db:studio    # Запуск Drizzle Studio для визуального просмотра БД
```

---

## Roadmap

- [ ] Интеграция с Wildberries
- [ ] Интеграция с Яндекс Маркет
- [ ] Оповещения о снижении цены (Telegram-бот / Email)
- [ ] Экспорт истории цен в CSV/Excel
