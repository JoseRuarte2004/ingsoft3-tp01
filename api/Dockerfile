# ---- Etapa 1: build (con el toolchain para compilar el binding nativo de bcrypt) ----
FROM node:20.18-alpine AS build
WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

# ---- Etapa 2: runtime (sin compilador, solo el código y las deps ya compiladas) ----
FROM node:20.18-alpine AS final
WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/bin ./bin
COPY --from=build /app/routes ./routes
COPY --from=build /app/utilities ./utilities
COPY --from=build /app/public ./public
COPY --from=build /app/app.js ./app.js
COPY --from=build /app/database.js ./database.js

EXPOSE 5000
CMD ["sh", "-c", "node bin/migrate.js && node bin/www"]
