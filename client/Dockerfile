# ---- Etapa 1: build ----
# node:18 (no 20+): el toolchain de build (webpack 4 / react-scripts viejo) usa
# crypto.createHash('md4'), que OpenSSL 3 (Node >=17) eliminó. El flag de abajo
# lo evita sin bajar de versión hasta ese extremo.
FROM node:18.20-alpine AS build
WORKDIR /app
ENV NODE_OPTIONS=--openssl-legacy-provider

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Etapa 2: tests (parte del build: ya tiene Node y las devDependencies) ----
FROM build AS test
ENTRYPOINT ["npm", "run", "test:ci"]

# ---- Etapa 3: nginx sirve los estáticos ----
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
