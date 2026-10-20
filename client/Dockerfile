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
# La plantilla va en templates/, no en conf.d/: la imagen oficial de nginx
# corre envsubst sobre lo que encuentra en templates/ y lo deja en conf.d/;
# si estuviera directo en conf.d/, nginx la leería con los ${...} sin
# reemplazar y no arrancaría.
FROM nginx:1.27-alpine
COPY default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/build /usr/share/nginx/html
ENV BACKEND_URL=http://backend:5000 \
    DNS_RESOLVER=127.0.0.11
EXPOSE 80
