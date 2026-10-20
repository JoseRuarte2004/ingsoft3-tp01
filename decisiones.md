# Decisiones — TP1

## 1. Por qué Git no pudo resolver el conflicto solo

Git resuelve automáticamente los merges cuando los cambios tocan partes distintas del archivo, comparando ambas ramas contra su ancestro común. En este caso, las ramas `feature/titulo-a` y `feature/titulo-b` partieron del mismo commit de `main` y ambas modificaron **la misma línea** del `README.md` (el título), pero con contenido distinto. Git no tiene forma de decidir cuál de las dos versiones es "la correcta" — no es un problema técnico, es una decisión de contenido que solo puede tomar una persona.

Para que este conflicto nunca hubiera aparecido, alguna de las dos ramas debería haberse creado *después* de que la otra ya estuviera mergeada en `main` (así partiría de una base actualizada y no tocaría una línea "vieja"), o directamente ninguna de las dos debería haber tocado esa línea.

## 2. Qué problemas encontré y cómo los solucioné

Durante la prueba de fuego del paso 4.4 (verificar que el push directo a `main` fuera rechazado), hice un commit local de prueba (`test: intento de push directo`) que la guía indica borrar después con `git reset --hard HEAD~1`. Me lo salteé, y seguí trabajando: cuando más adelante hice `git pull` después de mergear el primer PR desde la web, Git me avisó que las ramas habían divergido (mi commit de prueba local vs. el commit del PR ya mergeado en el remoto), porque local y remoto tenían historiales distintos a partir de ese punto.

Lo solucioné con `git reset --hard origin/main`, que descarta cualquier commit local no subido y deja mi rama `main` idéntica a la del remoto. Fue un buen recordatorio de por qué la guía insiste en limpiar los commits de prueba apenas cumplen su función: dejarlos vivos genera divergencias artificiales que después hay que resolver a mano.

## 3. Declaración de uso de IA

Usé Claude (Anthropic) como asistente durante todo el TP: para entender la guía de la cátedra, para que me explicara paso a paso cada sección antes de ejecutarla, y para diagnosticar y resolver el problema de divergencia de ramas del punto 2. No generó ningún commit ni tocó el repositorio directamente — cada acción (crear el repo, proteger `main`, crear las ramas, resolver el conflicto, taguear la release) la ejecuté yo mismo desde la web de GitHub o mi terminal, verificando en cada paso que el resultado fuera el esperado antes de seguir. También me ayudó a redactar este archivo y `evidencias.md` a partir de lo que realmente pasó durante la sesión.

---

# Decisiones — App del semestre (TP2)

## Qué app elegí y por qué

Elegí **YourInventoryManager**, una app de gestión de inventario doméstico (qué tenés guardado, en qué lugar de la casa y cuándo vence), tomada de un proyecto open-source de GitHub y adaptada por mí. Cumple los requisitos mínimos: backend con API propia (Node.js + Express, `api/`), frontend SPA (React + TypeScript, `client/`) e interacción con base de datos relacional (PostgreSQL vía Sequelize).

## Criterios de elección

- **¿Buildea y corre localmente hoy, sin magia?** La probé ANTES de comprometerme, y no arrancaba tal cual: tenía varios bugs reales que tuve que arreglar para que funcionara de punta a punta (detallados abajo). Una vez arreglados, corre local sin necesidad de instalar Postgres en la máquina (el motor es un contenedor vía `docker-compose.yml`, según lo pedido en el checkpoint).
- **¿Tiene o puedo escribirle tests?** Ya traía un archivo de tests (`api/database.test.js`) que directamente no corría (usaba `db.Product` en mayúscula, cuando el módulo exporta `product` en minúscula). Lo arreglé y hoy los 3 tests pasan (`npm test` en `api/`). Buena base para TP5.
- **¿Entendés el código lo suficiente como para modificarlo?** Sí — encontré y corregí varios bugs no triviales (ver abajo), y agregué funcionalidad nueva (Update de productos, logout, validaciones), lo que en los hechos ya demuestra poder modificar la app en vivo.
- **Tamaño**: 2 pantallas (Authentication, Inventory) + CRUD completo sobre productos. No le agregué más pantallas a propósito, para no sumar fricción sin sumar nota.

## Bugs que encontré y arreglé en el código heredado

Al adaptar la app encontré que, tal cual estaba, no funcionaba realmente aunque "corriera":

1. **Los productos nunca quedaban asociados al usuario que los creaba** (`api/routes/products.js`): el `POST /products` no seteaba la foreign key al usuario logueado, y `GET /products` filtraba por esa foreign key — resultado: la tabla de Inventory se veía siempre vacía, aunque los datos estuvieran en la base.
2. **La foreign key se llamaba `"user.id"`** (con un punto, un identificador inválido) en `api/database.js`. Esto rompía `npm run migrate` la segunda vez que se corría (Sequelize generaba un `ALTER TABLE ... DROP CONSTRAINT` mal formado y la migración crasheaba). La renombré a `userId`.
3. **`matchUserCredentials.js`** nunca hacía `return`, así que siempre resolvía `undefined`; y se usaba mal en `products.js` (`(async () => ...)` sin invocar ni esperar la promesa, así que la condición era siempre verdadera). Lo arreglé para que efectivamente valide y bloquee.
4. **Cualquier usuario autenticado podía leer o borrar productos de otro usuario por ID** (`GET /products/:id`, `DELETE /products/:id` no filtraban por dueño). Le agregué el filtro de ownership a esas rutas y a la nueva ruta de Update.
5. **No existía Update** en la API — solo Create, Read y Delete. Agregué `PUT /products/:id`.
6. **El endpoint `/csrf` mandaba dos respuestas en la misma request** (`response.send()` dos veces sin `return`), lo que tiraba un error de servidor (`ERR_HTTP_HEADERS_SENT`) en cada llamada, aunque el cliente no lo notara.
7. **El rate limiter global era de 5 requests por minuto para toda la app** (`express-rate-limit` con la config por defecto), lo que hacía imposible usarla más de unos segundos seguidos. Lo dejé en una config más realista (300 req / 15 min) sin sacar la protección.
8. **No había forma de crear, editar ni borrar productos desde la interfaz** — `Inventory.tsx` solo mostraba una tabla de solo lectura. Agregé el formulario de alta/edición y los botones de eliminar, completando el CRUD también del lado del cliente.
9. **El login no redirigía a ningún lado** tras autenticarse, y la ruta `/` no existía (pantalla en blanco). Agregué el redirect a `/Inventory` tras login exitoso y una ruta por defecto en `/`.

## Dónde vive

En este mismo repo (`ingsoft3-tp01`), el del TP1 con las protecciones de rama ya configuradas — así el historial del semestre queda en un solo lugar, tal como evalúa el Integrador.

## Decisiones de contenerización

**Imágenes base:**
- **Backend** (`node:20.18-alpine`, en las dos etapas): Alpine por tamaño, versión pineada a `20.18` (no `:latest` ni solo `:20`) para que el build sea reproducible — no quiero que un patch nuevo de Node cambie el runtime sin que yo me entere.
- **Frontend, etapa de build** (`node:18.20-alpine`, no 20): no pude usar Node 20 acá. El front usa `webpack 4.44.2` (dependencia vieja heredada del proyecto original), que llama a `crypto.createHash('md4')` — algoritmo que OpenSSL 3 (el que trae Node ≥17) eliminó. Con Node 18 + la variable `NODE_OPTIONS=--openssl-legacy-provider` compila sin bajar a una versión de Node más vieja todavía.
- **Frontend, etapa final** (`nginx:1.27-alpine`): solo sirve archivos estáticos, no necesita Node para nada.

**Por qué multi-stage en cada uno:**
- **Backend**: la etapa de build instala `python3 make g++` porque `bcrypt` (dependencia productiva, no de desarrollo) compila un binding nativo al instalarse. La etapa final **no** lleva ese compilador: copia `node_modules` ya compilado y solo el código que hace falta en runtime (`bin/`, `routes/`, `utilities/`, `public/`, `app.js`, `database.js`) — nada de `.git`, tests, ni el propio compilador. Resultado real, medido: **723MB → 301MB**.
- **Frontend**: la etapa de build necesita el toolchain completo de webpack/babel para generar los estáticos; la etapa final es nginx puro con solo el resultado de `npm run build`. Resultado real, medido: **846MB → 77.1MB**.

**Qué persiste y qué no:**
- **Persiste**: los datos de Postgres, en el volumen nombrado `db-data` (`/var/lib/postgresql/data`). Sobrevive a `docker compose down` (sin `-v`) y a recrear los contenedores.
- **No persiste**: el código (vive en la imagen, es inmutable — para cambiarlo hay que reconstruir), y cualquier archivo que un contenedor escriba fuera de ese volumen se pierde al recrearlo. La sesión de usuario tampoco depende de esto: `cookie-session` la guarda firmada en una cookie del lado del cliente, no en el servidor — por eso sobrevive un restart del backend, pero deja de "resolver" a un usuario real si el volumen de la BD se borra (el `id` de la cookie ya no existe en la tabla `users`).

## Problemas reales encontrados en la contenerización y cómo los resolví

1. **El Dockerfile del backend existía en el disco pero nunca se había commiteado** (quedaba como archivo sin seguimiento en `git status`) — lo reescribí de cero como multi-stage real.
2. **El `docker-compose.yml` original solo tenía el servicio `db`**; no orquestaba nada del sistema. Lo reescribí completo: los 3 servicios, `healthcheck` + `depends_on: condition: service_healthy` en la BD, y variables por `${VAR}` en vez de la contraseña hardcodeada que tenía antes.
3. **Puerto 5000 ocupado por AirPlay Receiver de macOS** (el propio README ya lo advertía para el desarrollo local, y se repitió acá): mapeé el backend a `5050:5000` en el host, sin tocar el puerto interno (5000), que es el que usan `frontend`↔`backend` dentro de la red de compose — por nombre de servicio, no por el puerto publicado al host.
4. **Build del frontend roto por una dependencia mal pineada**: `client/package.json` fijaba `@babel/core` en `7.12.3` exacto, pero `babel-preset-react-app@10.1.0` (ya presente en el árbol de dependencias) necesita `^7.16.0`. El build fallaba con `Requires Babel "^7.16.0", but was loaded with "7.12.3"`. Lo resolví relajando el pin a `^7.16.0` y regenerando `package-lock.json` **dentro de un contenedor `node:18.20-alpine`** (no con mi Node local, que es la v26 y hubiera resuelto distinto).
5. **Webpack 4 + OpenSSL 3**: aun con Babel resuelto, el build de un proyecto con webpack 4 se rompe en Node ≥17 con `error:0308010C:digest routines::unsupported` (usa `md4` para hashear módulos, y OpenSSL 3 lo sacó). Se resuelve con `NODE_OPTIONS=--openssl-legacy-provider` en la etapa de build — lo agregué al Dockerfile del frontend.
6. **El patrón `/api/` del enunciado no aplica a esta app**: el backend monta sus rutas en la raíz (`/csrf`, `/users`, `/products`, sin prefijo `/api`). En vez de un único `location /api/`, el `nginx.conf` tiene tres `location` explícitos, uno por prefijo real que usa el frontend (verificado leyendo los `fetch(...)` del código del cliente).
7. **Conflicto de merge real al abrir el PR del TP2** (`feature/app-semestre` → `main`): `main` había avanzado con dos PRs que completaban `decisiones.md`/`evidencias.md`/`.gitignore` del TP1 mediante **squash merge**, mientras esta rama seguía teniendo los commits originales (sin squashear) que agregaban ese mismo contenido. Para Git, el ancestro común de ambas ramas es el commit donde esos archivos estaban vacíos — y como cada lado los llenó de forma independiente (con orden de secciones distinto en `decisiones.md`, y una diferencia real de una línea en `.gitignore`: `bin/` vs `/bin/`), no pudo fusionarlos solo. Es el mismo fenómeno que el punto 1 de arriba, pero entre ramas en vez de entre commits sueltos. Lo resolví a mano: en `.gitignore` mantuve `/bin/` (con barra inicial) y no `bin/` — la versión sin barra también ignoraría `api/bin/`, que en esta app **no** es una carpeta de build sino código fuente real (`api/bin/www`, `api/bin/migrate.js`); en `decisiones.md` y `evidencias.md` reordené para que la sección de TP1 quede primero (igual que en `main`) y la de TP2 después, sin perder contenido de ningún lado.

## Declaración de uso de IA — TP2

Usé Claude Code (Anthropic) para toda la implementación técnica de este TP: los Dockerfiles multi-stage de backend y frontend, sus `.dockerignore`, el `nginx.conf`, el `docker-compose.yml` y el `docker-compose.registry.yml`, el diagnóstico/resolución de los 7 problemas listados arriba (incluido el conflicto de merge del punto 7).

Cómo lo verifiqué (no acepté "quedó listo" sin ver el resultado real de cada paso):
- Vi el output completo de cada `docker build` antes de dar por bueno un Dockerfile — el build del frontend falló dos veces antes de andar, y las dos veces vi el error real y la corrección aplicada.
- El compose se probó de verdad: registré un usuario, hice login y creé un producto con `curl` contra el proxy del frontend (no me alcanzó con "los contenedores están `Up`").
- Corrí la prueba de persistencia dos veces —`down` sin `-v` y con `-v`— y confirmé con datos reales (el producto seguía / hasta el usuario dejó de existir) que el comportamiento era el esperado en cada caso, no lo asumí.
- Antes de tocar un registry externo, confirmé explícitamente cuál usar (ghcr.io) y aprobé el paso de autorización (`gh auth refresh -s write:packages`) y el push viendo el resultado real de cada comando.
- Después de publicar, cambié la visibilidad de los dos packages a público yo mismo desde la web (Claude no pudo hacerlo por API — es una limitación conocida del endpoint de GitHub), y lo verifiqué con `docker pull` sin sesión antes de darlo por confirmado.
- Cuando GitHub marcó el PR del TP2 como en conflicto, revisé yo mismo el diff de la resolución (qué contenido venía de cada lado, y por qué se resolvió como se resolvió) antes de aceptar el merge commit.
- No se mergeó el PR del TP2 ni se pusheó el tag `v2.0.0`: eso lo reviso y lo apruebo yo antes de que se ejecute.
