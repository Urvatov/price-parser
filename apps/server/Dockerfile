# Официальный образ Microsoft Playwright с предустановленным Chromium и системными библиотеками
FROM mcr.microsoft.com/playwright:v1.64.1-noble

WORKDIR /app

# Устанавливаем часовой пояс Europe/Moscow для защиты от антифрода Ozon
ENV TZ=Europe/Moscow
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Копируем манифесты зависимостей всего монорепозитория
COPY package*.json ./
COPY apps/server/package*.json ./apps/server/
COPY packages/types/package*.json ./packages/types/

# Устанавливаем зависимости
RUN npm ci

# Копируем исходники
COPY packages/types/ ./packages/types/
COPY apps/server/ ./apps/server/

# Сборка сервера (tsup собирает в apps/server/build/main.js)
RUN npm run build --workspace=price-parser-server

# Создаем директорию для профилей и кук
RUN mkdir -p profiles

EXPOSE 3000

# Запуск скомпилированного сервера
CMD ["npm", "run", "start", "--workspace=price-parser-server"]
