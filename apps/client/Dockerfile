# Этап 1: Сборка статических файлов клиента
FROM node:20-alpine AS builder

WORKDIR /app

# Копируем манифесты зависимостей
COPY package*.json ./
COPY apps/client/package*.json ./apps/client/
COPY packages/types/package*.json ./packages/types/

# Устанавливаем зависимости
RUN npm ci

# Копируем исходный код
COPY packages/types/ ./packages/types/
COPY apps/client/ ./apps/client/

# Сборка статики Vite (результат в apps/client/build)
RUN npm run build --workspace=price-parser-client

# Этап 2: Раздача через Nginx
FROM nginx:alpine

# Копируем конфигурацию Nginx
COPY apps/client/nginx.conf /etc/nginx/conf.d/default.conf

# Копируем собранную статику
COPY --from=builder /app/apps/client/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
