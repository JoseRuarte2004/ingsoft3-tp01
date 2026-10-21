# ---- Etapa 1: build (con el toolchain para compilar bcrypt, y CON devDependencies
#      -- jest incluido -- para poder correr los tests en la etapa de abajo) ----
FROM node:20.18-alpine AS build
WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# ---- Etapa 2: tests (parte del build: ya tiene jest y el código) ----
FROM build AS test
ENTRYPOINT ["npm", "run", "test:ci"]

# ---- Etapa 3: SOLO dependencias de producción (sin jest, sin devDependencies) ----
FROM node:20.18-alpine AS prod-deps
WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- Etapa 4: runtime (sin compilador, solo el código y las deps de producción) ----
FROM node:20.18-alpine AS final
WORKDIR /app

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/instrument.js ./instrument.js
COPY --from=build /app/bin ./bin
COPY --from=build /app/routes ./routes
COPY --from=build /app/services ./services
COPY --from=build /app/utilities ./utilities
COPY --from=build /app/public ./public
COPY --from=build /app/app.js ./app.js
COPY --from=build /app/database.js ./database.js

EXPOSE 5000
CMD ["sh", "-c", "node bin/migrate.js && node bin/www"]
