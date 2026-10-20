

# ingsoft3-tp01

[![CI](https://github.com/JoseRuarte2004/ingsoft3-tp01/actions/workflows/ci.yml/badge.svg)](https://github.com/JoseRuarte2004/ingsoft3-tp01/actions/workflows/ci.yml)

## App del semestre: YourInventoryManager

Aplicación de gestión de inventario doméstico (qué tenés guardado, dónde y cuándo vence). Ver [decisiones.md](decisiones.md) para el porqué de esta elección.

- **Backend**: Node.js + Express + Sequelize (`api/`)
- **Frontend**: React + TypeScript (`client/`)
- **Base de datos**: PostgreSQL (corre como contenedor, no hace falta instalarlo)

### Cómo correrla (Docker, un solo comando)

Requisito: Docker Desktop (o Docker Engine + Compose) corriendo.

```bash
git clone https://github.com/JoseRuarte2004/ingsoft3-tp01.git
cd ingsoft3-tp01
cp .env.example .env      # editá los valores si querés, los de ejemplo ya funcionan
docker compose up -d --build
```

Eso levanta los 3 servicios (Postgres, backend, frontend con nginx) y crea las tablas solo. Cuando terminen de arrancar (`docker compose ps` muestra los tres `Up`, la BD como `healthy`):

- Frontend: http://localhost:3000
- Backend (directo, por si querés pegarle con curl/Postman): http://localhost:5050
- Postgres: `localhost:5432` (user/pass/db según tu `.env`)

> **Nota macOS**: el backend publica el puerto **5050** en el host (no 5000) porque en macOS el puerto 5000 suele estar tomado por AirPlay Receiver. El puerto **interno** de la red de compose sigue siendo 5000 — así se comunican `frontend` y `backend` entre sí, eso no cambia.

Para bajar todo conservando los datos: `docker compose down`. Para bajar todo **y borrar los datos** (empezar de cero): `docker compose down -v`.

### Variante con imágenes publicadas (sin construir nada localmente)

Las imágenes de back y front están publicadas, públicas, en GitHub Container Registry:

- `ghcr.io/joseruarte2004/ingsoft3-tp01-backend:v0.1.0`
- `ghcr.io/joseruarte2004/ingsoft3-tp01-frontend:v0.1.0`

```bash
cp .env.example .env
docker compose -f docker-compose.registry.yml up -d
```

### Correr el backend o el frontend sueltos, sin Docker (para desarrollo)

**Backend**:
```bash
cd api
cp .env.example .env   # y poné DB_HOST=localhost (si la BD corre en Docker vía `docker compose up -d db`)
npm install
npm run migrate
npm start               # http://localhost:5000
```

**Frontend** (en otra terminal):
```bash
cd client
npm install
npm start               # http://localhost:3000, proxea a localhost:5000 (ver "proxy" en client/package.json)
```

### Tests

```
cd api
npm test
```
