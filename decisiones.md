# Decisiones — TP1

## 1. Por qué Git no pudo resolver el conflicto solo

Git resuelve automáticamente los merges cuando los cambios tocan partes distintas del archivo, comparando ambas ramas contra su ancestro común. En este caso, las ramas `JoseRuarte2004-patch-1` (PR #2) y `JoseRuarte2004-patch-2` (PR #3) partieron del mismo commit de `main` y ambas modificaron **la misma línea** del `README.md` (el título), pero con contenido distinto. Git no tiene forma de decidir cuál de las dos versiones es "la correcta" — no es un problema técnico, es una decisión de contenido que solo puede tomar una persona.

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

---

# Decisiones — TP4 (CI)

## Estructura del pipeline: por qué esos dos jobs, y por qué en paralelo

El workflow (`.github/workflows/ci.yml`) tiene dos jobs, `build-api` y `build-client` — los nombré así, no `build-backend`/`build-frontend` como sugiere la guía, porque mis carpetas son `api/` y `client/` y prefiero que el nombre del check coincida con la carpeta real. Dos jobs porque mi app tiene **dos Dockerfiles independientes** (TP2): uno para el backend Node/Express y otro para el frontend React servido por nginx. No comparten nada en build time — ni dependencias, ni etapas, ni artefactos — así que no hay ninguna razón para serializarlos: cada uno corre en su propio runner limpio, en paralelo, y un PR que solo toca `client/` no hace más lento el chequeo del backend.

Corren en `pull_request` (contra `main`) y en `push` (a `main`). El primero es el que importa de verdad: verifica el resultado propuesto *antes* de que exista en `main`, y es el que alimenta al gate (abajo). El segundo no verifica nada nuevo —lo que entra a `main` ya pasó por un PR verde— pero cumple dos funciones: le da al badge del README una corrida de la que leer el estado, y deja el cache de capas sembrado en `main`, que es lo que cualquier PR nuevo va a poder reutilizar desde su primera corrida (ver abajo).

## Qué cachea, qué no, y qué pasa si desaparece

Se cachean las **capas de la imagen Docker** de cada etapa de build — no el código fuente ni los artefactos finales. Uso `docker/setup-buildx-action` (el constructor de fábrica no sabe exportar cache a un almacén externo, solo al disco del runner, que se destruye al terminar el job) y `cache-from`/`cache-to: type=gha` con un **scope distinto por job** (`scope=api`, `scope=client`). Sin el scope separado, los dos jobs comparten el mismo estante de cache por default y se pisan entre sí — el síntoma es que un job muestra `CACHED` y el otro no, y cuál cambia de corrida en corrida.

Evidencia de que funciona: en la segunda corrida del PR #9 ([run 39445545262](https://github.com/JoseRuarte2004/ingsoft3-tp01/actions/runs/39445545262)), tanto `build-api` como `build-client` muestran varias capas `CACHED` (instalación de dependencias con `npm ci`, principalmente — son las etapas más caras y las que menos cambian commit a commit).

**Si el cache desaparece** (GitHub lo desaloja por tamaño o antigüedad, o es la primera corrida de un PR nuevo contra una `main` que todavía no lo sembró), el pipeline no falla: vuelve a construir esa capa desde cero. El cache es una optimización de tiempo, no una dependencia funcional — si algo solo funciona *con* cache, lo que hay ahí no es un cache, es una dependencia escondida.

## Por qué el pipeline construye con mi Dockerfile y no compila por su cuenta

Si el workflow tuviera pasos propios de `npm ci` / `npm run build` en vez de delegar en `docker build ./api` y `docker build ./client`, tendría **dos definiciones de build**: la que usa el pipeline para verificar y la que usan mis Dockerfiles para lo que después se despliega (TP6/TP7). Son procesos distintos que tarde o temprano divergen — por ejemplo, si cambio una versión de Node en el Dockerfile y me olvido de replicarlo en el workflow, estaría verificando una compilación distinta de la que realmente se corre en producción. Delegar en el Dockerfile también es lo que hace que este mismo workflow sirva para cualquier stack: no hay una sola línea de Node ni de configuración específica de mi app en `ci.yml` — todo lo que sabe compilar mi app vive en `api/Dockerfile` y `client/Dockerfile`, no en el pipeline.

## El gate: qué exige hoy `main` para aceptar un merge

Después de la primera corrida verde, reconfiguré la protección de `main` (`gh api --method PUT .../branches/main/protection`) agregando `required_status_checks` sin perder lo que ya tenía del Paso 0 — el PUT reemplaza el JSON entero, así que tuve que releer el estado actual antes de escribir el nuevo. Hoy `main` exige dos cosas para un merge: **PR obligatorio** (0 aprobaciones requeridas, se aplica incluso a mí como admin — del TP1/Paso 0) y **los dos checks (`build-api`, `build-client`) en verde, con `strict: true`** (la rama tiene que estar actualizada contra `main`, no solo pasar los checks sobre una base vieja).

## Demostración del gate actuando

PR #11 ([feature/demo-gate](https://github.com/JoseRuarte2004/ingsoft3-tp01/pull/11)): agregué una dependencia inexistente (`paquete-que-no-existe-xyz123`) a `api/package.json` sin tocar `package-lock.json`, lo que rompe `npm ci --omit=dev` dentro del Dockerfile (mi backend no compila ni empaqueta, así que la forma real de romper su build es una dependencia, no un import — un `require` a un archivo inexistente nunca se ejecuta durante `docker build`, porque nadie corre el código en esa etapa).

- Corrida en rojo: [run 39446236934](https://github.com/JoseRuarte2004/ingsoft3-tp01/actions/runs/39446236934) — `build-api` falla con un 404 del registry de npm, `build-client` sigue en verde (son independientes).
- `gh pr view 11` mostró `mergeStateStatus: BLOCKED`, y `gh pr merge 11 --squash` lo rechazó explícitamente: *"the base branch policy prohibits the merge"*.
- Fix en el commit siguiente (saco la dependencia): corrida en verde, [run 39446411454](https://github.com/JoseRuarte2004/ingsoft3-tp01/actions/runs/39446411454), `mergeStateStatus: CLEAN`, mergeado.

De paso, aproveché el PR #10 (el del badge, abierto en simultáneo) para mostrarme a mí mismo el efecto de `strict: true`: al mergear el #11, el #10 pasó a `mergeStateStatus: BEHIND` (su base ya no era la última `main`), y actualicé su rama con el endpoint de "Update branch" (`PUT /pulls/10/update-branch`) y recién ahí volvió a `CLEAN`.

## Problemas encontrados y cómo los resolví

- El PUT de branch protection **reemplaza el JSON entero**: si solo mandaba `required_status_checks`, perdía `enforce_admins`, `allow_force_pushes: false`, etc. del Paso 0. Solución: leer primero el estado actual con `gh api .../protection` (GET) y recién armar el PUT con todos los campos, no solo el nuevo.
- Para romper el build de un backend Express sin paso de compilación, un `import`/`require` roto no sirve (nadie ejecuta el código durante `docker build`) — hay que romper algo que el Dockerfile sí ejecuta en build time, en este caso la instalación de dependencias.

## Declaración de uso de IA — TP4

Usé Claude Code para la implementación completa de este TP: el workflow, la configuración del gate por API, y el armado de los tres PRs (pipeline, badge, demo).

Cómo lo verifiqué:
- Miré las dos corridas del PR #9 en la pestaña *Actions* y confirmé con `grep` sobre el log (`gh run view --log`) que las capas realmente decían `CACHED`, no lo di por hecho porque el job terminara verde.
- Antes de abrir el PR de la demo, corrí `docker build ./api` en mi máquina y vi el error 404 real, para no depender de la corrida en el runner para confirmar que la rotura funcionaba.
- Vi en vivo el rechazo de `gh pr merge` sobre el PR bloqueado, y el cambio de estado a `BEHIND` y después `CLEAN` en el PR del badge — no asumí que `strict: true` funcionaba, lo confirmé con la API en cada paso.
- Cada push y cada merge los aprobé yo explícitamente antes de que se ejecutaran.

---

# Decisiones — TP5 (Testing y calidad)

## Mi stack vs. el de la guía (tabla "Tu stack, de un vistazo")

La guía está escrita sobre .NET + vitest. Mi stack es Node/Express + Jest de los dos lados (backend y frontend, ya que el frontend es una Create React App ejectada con Jest, no vitest). Equivalencias usadas:

| Lo que pide la guía | Lo que usé |
|---|---|
| Parametrizado (`[Theory]`/`it.each`) | `test.each` (Jest, los dos lados) |
| Fabricar el doble | `jest.fn()` (inyección por parámetro) y `jest.mock()` (reemplazo de módulo completo) — usé las **dos** técnicas, ver abajo |
| Medir cobertura | `--coverage` de Jest (provider nativo V8) |
| Umbral que rompe el build | `coverageThreshold` de Jest (`package.json` → `"jest"` → `"coverageThreshold"`) |
| Qué entra en la cuenta | `collectCoverageFrom` de Jest (incluye, no excluye — ver abajo por qué elegí esa dirección en el frontend) |
| Reporte legible | `coverageReporters: ["text","html","lcov","json-summary"]` — el `json-summary` es el que lee el paso del pipeline para armar la tabla del Job Summary |

## Qué lógica elegí testear y por qué

Elegí la **validación de productos** como núcleo de la suite porque es donde un bug duele de verdad en esta app: antes del TP5, `POST /products` no validaba absolutamente nada (lo detectamos en el Paso 0) — se podía crear un producto con nombre vacío, cantidad negativa, o sin lugar de almacenamiento, y quedaba en la base tal cual. Es exactamente el tipo de regla que un test automático tiene que proteger, porque un `curl` manual durante el desarrollo no la va a probar con los casos límite.

También testeé `matchUserCredentials` (ownership: que un usuario no pueda tocar productos de otro) porque es una regla de seguridad, no solo de UX — si se rompe, no se nota mirando la pantalla, se nota cuando alguien ve datos ajenos.

## El refactor que hizo falta para poder mockear

`api/routes/products.js` importaba `db` (el módulo de Sequelize) directo adentro del archivo. Así, no hay forma de que un test le pase un doble: el `require("../database")` está hardcodeado en el módulo. Extraje `api/services/productService.js`, que valida y después hace `db.product.create(...)` — pero recibe `db` **por parámetro**, no lo importa. La ruta le pasa el `db` real; el test le pasa un objeto falso (`{ product: { create: jest.fn() } }`). Es la misma idea que `INotificador` en el ejemplo de la guía: la dependencia entra desde afuera.

Para `matchUserCredentials.js` usé la otra técnica (`jest.mock("../database", () => ...)`, que reemplaza el módulo entero) en vez de refactorizarlo — a propósito, para demostrar las dos formas de mockear que existen en Jest, no solo una.

## Umbral de cobertura: el número y por qué

**Backend** — `lines: 25`, `branches: 40` sobre mi medición real de hoy (27.02% líneas, 43.75% ramas — [ver el Job Summary de un run verde](https://github.com/JoseRuarte2004/ingsoft3-tp01/actions/runs/39454006275)). Empecé en 15/25 (mi número real en ese momento era 16.92/31.25) y lo subí en el PR [#16](https://github.com/JoseRuarte2004/ingsoft3-tp01/pull/16) cuando la suite del PR del gate ([#15](https://github.com/JoseRuarte2004/ingsoft3-tp01/pull/15)) hizo subir el número real — si lo hubiera dejado en 15/25, el umbral habría dejado de frenar nada.

Lo bajo que es el número (comparado con el 70-80% típico de los ejemplos de la guía) tiene una razón concreta y la cuento sin esconderla: **dejé `routes/*.js` adentro de la cuenta** (`csrf.js`, `products.js`, `users.js` — 0% cada uno) porque tienen lógica real sin testear (el chequeo de usuario/email duplicado en `users.js`, el manejo de sesión) que no llegué a cubrir esta semana por tiempo. Excluirlos habría sido exactamente la trampa que la guía marca: "esconder lo que no testeé" en vez de "medir lo que importa". **Qué haría falta para subirlo**: tests de integración tipo `supertest` sobre esas tres rutas (fuera del alcance de unit tests — para eso está el TP7).

**Frontend** — `lines: 85`, `branches: 75` sobre mi medición real (88.23% líneas, 77.77% ramas). Acá el número es alto porque, siguiendo lo que dice la propia guía ("la UI completa se verifica end-to-end en el TP7, contra la app desplegada de verdad"), **la cuenta (`collectCoverageFrom`) mide solo los tres módulos puros/inyectables que escribí** (`validarProductoForm.ts`, `productsClient.ts`, `fetchcsrf.ts`) — no los componentes React (`Inventory.tsx`, `Authentication.tsx`), que no tienen una sola prueba todavía y se dejan para el e2e con navegador del TP7.

## Qué dejé afuera de la cuenta de cobertura, y por qué

- **Backend** (`collectCoverageFrom` con exclusiones): `bin/` (arranque — `www`, `migrate.js`), `app.js` (cableado de middlewares, sin reglas de negocio), `database.js` (definición de modelos de Sequelize — son las "clases de datos" del §2.4, solo propiedades). Son exactamente las dos familias que la guía nombra: arranque y datos.
- **Backend, lo que NO excluí aunque arrastra el número para abajo**: `routes/*.js` — tienen lógica real, así que quedan adentro (ver arriba).
- **Frontend** (`collectCoverageFrom` por inclusión, no por exclusión): listo explícitamente los tres módulos puros. Todo lo demás (componentes, `App.js`, `index.tsx`) queda afuera porque es UI — se verifica con interacción real en el TP7, no con un test sin DOM.

## Por qué coverage alto no garantiza calidad (con mi propio ejemplo)

Si `api/services/productService.test.js` tuviera este test:

```js
test("crea un producto", async () => {
  const dbFalso = { product: { create: jest.fn().mockResolvedValue({}) } };
  await crearProducto(productoValido, 1, dbFalso);
  // sin ningún expect
});
```

ese test deja `crearProducto` al 100% de líneas ejecutadas (entra, valida, llama a `create`, retorna) y **no verifica absolutamente nada** — ni que `create` se haya llamado con los datos correctos, ni que el resultado tenga la forma esperada. Es exactamente el `CoberturaSinVerdad` de la guía: coverage mide que el código **corrió**, no que alguien comprobó que hizo lo correcto. Mis tests reales, en cambio, sí hacen `expect(dbFalso.product.create).toHaveBeenCalledWith(...)` — verifican la interacción, no solo la ejecución.

## El ejercicio del camino sin cubrir

**Línea**: `api/utilities/validarProducto.js`, línea 6 (`const datos = producto || {};`). La primera corrida de la suite (antes del último test que agregué) marcaba esa rama en naranja: el `|| {}` nunca se ejercitaba con el lado izquierdo falsy — solo entraba con `producto` siempre presente.

**Qué entrada la recorrería**: `validarProducto(null)` o `validarProducto(undefined)` — el caso defensivo de "nadie llama bien a la función".

**Qué decidí**: agregarlo (está en `api/utilities/validarProducto.test.js`, el test `"rechaza cuando no se pasa ningún producto"`). Es una entrada real y barata de cubrir — no hay motivo para dejarla afuera.

## El Pull Request bloqueado (Tarea 3)

**PR mergeado** ([#15](https://github.com/JoseRuarte2004/ingsoft3-tp01/pull/15)): agregué `api/utilities/estadoVencimiento.js` (clasifica productos por vencimiento) sin un solo test.
- Corrida roja: [run 39453746457](https://github.com/JoseRuarte2004/ingsoft3-tp01/actions/runs/39453746457) — `build-api` falla, pero **los 12 tests existentes pasan todos**. El check se rompió por **cobertura de líneas**: `Jest: Coverage for lines (14.86%) does not meet "global" threshold (15%)` (el log lo dice textual).
- `gh pr view` mostró `mergeStateStatus: BLOCKED`.
- Arreglo: agregué `estadoVencimiento.test.js` (un test por cada camino que el código nuevo declara: `sin-fecha`, `vencido`, `por-vencer`, `esta-semana`, `fresco`, y los 5 casos de `prioridadDeAlerta`).
- Corrida verde: [run 39454006275](https://github.com/JoseRuarte2004/ingsoft3-tp01/actions/runs/39454006275), `mergeStateStatus: CLEAN`, mergeado.

**PR que queda abierto y en rojo hasta la defensa** ([#17](https://github.com/JoseRuarte2004/ingsoft3-tp01/pull/17)): `api/utilities/normalizarStorageLocation.js`, sin tests, rompe por **cobertura de ramas**: `Jest: Coverage for branches (36.08%) does not meet "global" threshold (40%)` ([run 39454908964](https://github.com/JoseRuarte2004/ingsoft3-tp01/actions/runs/39454908964)). **A propósito no se toca**: queda como la prueba de que el freno funciona sin depender de una captura de pantalla.

## Problemas encontrados y cómo los resolví

- **`jest` no estaba instalado en `api/`** pese a que `"test": "jest"` y `api/database.test.js` ya existían — `npm test` fallaba con `jest: command not found`. Lo encontré corriendo `npm test` antes de escribir nada, no asumiendo que "ya pasaba" porque lo decía `decisiones.md` del TP2.
- **`client/package.json` tenía `"testRunner"` apuntando a una ruta absoluta** de la máquina del autor original del repo open source (`/home/elliot/programming/...`). Rota en cualquier otra máquina. La arreglé apuntando al módulo relativo (`jest-circus/runner`).
- **`api/Dockerfile` no copiaba la carpeta `services/` nueva a la imagen final**: lo detecté corriendo el smoke test completo contra el stack levantado en Docker, no confiando solo en que `npm test` pasara en mi máquina.
- **Los `yarn.lock` se reescribían solos** al correr `npm install`/`npm ci` (aunque el build real usa `npm ci` con `package-lock.json`). Revertí esos cambios para no meter un diff de 20.000 líneas irrelevante.
- **El umbral del backend quedó obsoleto a mitad de semana**: subió la cobertura real por los PRs del gate y dejé de poder romperlo con un archivo chico para la segunda demo. Lo subí (PR #16) antes de seguir, documentado arriba.

## Enlaces de este TP

- Suite de unit tests: [PR #13](https://github.com/JoseRuarte2004/ingsoft3-tp01/pull/13)
- Cobertura + etapa de tests en el pipeline: [PR #14](https://github.com/JoseRuarte2004/ingsoft3-tp01/pull/14)
- Demo del gate (mergeado): [PR #15](https://github.com/JoseRuarte2004/ingsoft3-tp01/pull/15) — rojo: [run 39453746457](https://github.com/JoseRuarte2004/ingsoft3-tp01/actions/runs/39453746457) · verde: [run 39454006275](https://github.com/JoseRuarte2004/ingsoft3-tp01/actions/runs/39454006275)
- Ajuste del umbral: [PR #16](https://github.com/JoseRuarte2004/ingsoft3-tp01/pull/16)
- Demo del gate (abierto, en rojo hasta la defensa): [PR #17](https://github.com/JoseRuarte2004/ingsoft3-tp01/pull/17) — [run 39454908964](https://github.com/JoseRuarte2004/ingsoft3-tp01/actions/runs/39454908964)

## Declaración de uso de IA — TP5

Usé Claude Code para toda la implementación: el diseño de la suite (qué testear y por qué), el refactor de inyección de dependencias, la configuración de cobertura en los dos lados, las etapas de Docker y los PRs de demostración.

Cómo lo verifiqué:
- Antes de escribir un solo test, corrí `npm test` en los dos lados y confirmé con mis propios ojos que los dos fallaban (por motivos distintos) — no asumí que "ya andaban" porque un `decisiones.md` anterior lo decía.
- Después del refactor de `products.js`, corrí un smoke test completo contra el stack real en Docker (registro, login, alta válida 200, alta inválida 400) — eso fue lo que encontró el bug del `Dockerfile` que no copiaba `services/`.
- Calculé a mano cuántas líneas/ramas nuevas hacían falta para que cada PR de demostración realmente rompiera el umbral (no tanteé a ciegas), y medí el resultado real con `npm run test:ci` antes de pushear cada uno.
- Leí el log de cada corrida roja (`gh run view --log`) para confirmar que decía lo que yo esperaba que dijera, no solo que el job estuviera en rojo.
- Cada push y cada merge los aprobé yo explícitamente antes de que se ejecutaran.
