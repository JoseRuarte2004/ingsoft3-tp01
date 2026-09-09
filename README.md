

# ingsoft3-tp01

## App del semestre: YourInventoryManager

Aplicación de gestión de inventario doméstico (qué tenés guardado, dónde y cuándo vence). Ver [decisiones.md](decisiones.md) para el porqué de esta elección.

- **Backend**: Node.js + Express + Sequelize (`api/`)
- **Frontend**: React + TypeScript (`client/`)
- **Base de datos**: PostgreSQL (corre como contenedor, no hace falta instalarlo)

### Instalación

```
git clone https://github.com/JoseRuarte2004/ingsoft3-tp01.git
```

### Cómo correrla localmente

**1. Base de datos** (contenedor, desde la raíz del repo):

```
docker compose up -d db
```

**2. Backend**:

```
cd api
cp .env.example .env
```

Editá `api/.env` y poné `DB_HOST=localhost` (el valor `db` del `.env.example` es el hostname que usaría el propio backend si algún día corre *dentro* de docker-compose junto a la base; corriendo la API en tu máquina como en este TP, tiene que apuntar a `localhost`). `DB_PASSWORD` debe ser `changeme` para que coincida con `docker-compose.yml`.

```
npm install
npm run migrate   # crea las tablas
npm start         # http://localhost:5000
```

**3. Frontend** (en otra terminal):

```
cd client
npm install
npm start          # http://localhost:3000
```

El cliente hace proxy de `/csrf`, `/users` y `/products` hacia `http://localhost:5000` (ver `"proxy"` en `client/package.json`), así que el backend tiene que estar corriendo en ese puerto.

> Nota macOS: el puerto 5000 puede estar tomado por AirPlay Receiver. Si pasa, desactivalo en Configuración del Sistema → General → AirDrop y Handoff, o corré la API con `PORT=<otro puerto> npm start` y actualizá el proxy del cliente para que coincida.

### Tests

```
cd api
npm test
```
