# Price Parser

Персональный сервис для регулярного мониторинга и сохранения истории цен на маркетплейсах.

## Стек

- **Runtime:** Node.js, TypeScript
- **HTTP / API:** Fastify, Swagger UI
- **Scraping:** Playwright (Chromium с персистентной сессией)
- **Database:** PostgreSQL, Drizzle ORM
- **Queue / Scheduler:** Redis, BullMQ, Croner

## Что умеет сервис

- Принимает ссылку или артикул (SKU) товара через HTTP API
- В фоновом режиме парсит актуальную цену с учетом скидок и статус наличия
- Ведет хронологическую историю изменения цен в PostgreSQL
- Периодически обновляет цены по расписанию и по ручному триггеру

---

# Roadmap

## Клиент

- Веб-интерфейс для отслеживания динамики цен и добавления товаров

## Остальные маркетплейсы

- Wildberries
- Yandex Market
- Avito
