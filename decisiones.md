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

Más adelante (ver "Corrección" abajo) sumé el registro de usuarios (`api/services/userService.js`): el rechazo de username/email duplicado es otra regla de negocio real — sin ella, dos usuarios podrían terminar compartiendo credenciales de facto.

## El refactor que hizo falta para poder mockear

`api/routes/products.js` importaba `db` (el módulo de Sequelize) directo adentro del archivo. Así, no hay forma de que un test le pase un doble: el `require("../database")` está hardcodeado en el módulo. Extraje `api/services/productService.js`, que valida y después hace `db.product.create(...)` — pero recibe `db` **por parámetro**, no lo importa. La ruta le pasa el `db` real; el test le pasa un objeto falso (`{ product: { create: jest.fn() } }`). Es la misma idea que `INotificador` en el ejemplo de la guía: la dependencia entra desde afuera. El mismo patrón, más adelante, para `api/services/userService.js` (el registro de usuarios).

Para `matchUserCredentials.js` usé la otra técnica (`jest.mock("../database", () => ...)`, que reemplaza el módulo entero) en vez de refactorizarlo — a propósito, para demostrar las dos formas de mockear que existen en Jest, no solo una.

## Umbral de cobertura: el número, por qué, y cómo llegué ahí (con un error de por medio)

**Primer intento (equivocado).** Cuando armé el gate por primera vez, dejé `routes/*.js` **adentro** de la cuenta de cobertura y puse el umbral en 15/25 (después 25/40 cuando la suite lo hizo subir a 27/43.75) — razonando que excluir rutas sin testearlas sería "esconder lo que no probé". Al releer la guía (§2.4) para preparar el TP6 me di cuenta de que esto estaba mal en dos sentidos:

1. **La guía dice explícitamente que las rutas van en la familia "arranque"** a excluir ("el archivo que cablea la aplicación… la configuración de servicios, **las rutas**"), igual que `Program.cs`. Yo las había dejado adentro por una lectura apurada.
2. Pero la guía también avisa: *"excluir el arranque vale cuando ahí no queda lógica — si todavía tenés reglas adentro, primero sacalas, y recién después excluís"*. Y `routes/users.js` sí tenía una regla real sin extraer (el rechazo de username/email duplicado en `/register`). Si hubiera excluido rutas tal cual estaban, habría caído en la trampa exacta que el §2.4 describe: medí solo `api/utilities/productService.js` → me daba 100%/97% → un número "perfecto" que en realidad solo significa que escondí lo único que no estaba probado.

**La corrección**: extraje `api/services/userService.js` (mismo patrón que `productService.js` — recibe `db` por parámetro, 3 tests con mock) para que esa regla quedara medida y testeada. Recién ahí excluí `routes/*.js` del todo (ahora sí sin ninguna lógica de negocio adentro — lo que queda ahí es manejo de sesión de Passport, status codes y el cableado HTTP, que es "configuración de servicios" en los términos de la guía).

**Número real después de la corrección**: 100% líneas / 97.5% ramas, sobre `api/services/` y `api/utilities/` (52 líneas, 40 ramas en total — un pool chico). Puse el umbral en **`lines: 85`, `branches: 80`**, no pegado al número real: con un pool de apenas 52 líneas, un umbral a 95/90 se rompe con cualquier archivo nuevo sin tests, y en el TP6/TP9 van a entrar archivos de infraestructura (configuración de Sentry, el endpoint `/health`) que pueden caer adentro de la cuenta sin tener ninguna regla de negocio — no quiero que el pipeline se rompa por eso en mitad de otro TP. 85/80 deja el margen que pide el ejemplo de la guía ("puse 70 porque mi lógica hoy mide 74… para que me frene si baja, no que sea inalcanzable") sin ser tan frágil. Si en algún TP más adelante entra un archivo así, lo excluyo explícitamente de `collectCoverageFrom` y lo anoto acá, igual que con `bin/`/`app.js`/`database.js`.

**Frontend** — `lines: 85`, `branches: 75` sobre mi medición real (88.23% líneas, 77.77% ramas). Acá también corregí algo al releer §3.3: la guía pide medir **por carpeta** (`include: ['src/TU-CARPETA/**']`), no archivos sueltos — así un archivo nuevo sin tests entra solo a la cuenta, que es justamente lo que hace posible el ejercicio del §3.5. Mi primera versión listaba los tres archivos puros uno por uno (`collectCoverageFrom: ["src/inventory/validarProductoForm.ts", "src/api/productsClient.ts", "src/utilities/fetchcsrf.ts"]`): en los hechos medía lo mismo hoy, pero un archivo nuevo sin tests en esas carpetas **no habría aparecido en la cuenta**, porque esas carpetas también tienen componentes React mezclados. Moví los tres módulos puros a una carpeta nueva y dedicada (`client/src/logic/`) y cambié la config a `collectCoverageFrom: ["src/logic/**/*.ts", "!src/logic/**/*.test.ts"]`. El número no cambió (sigue siendo 88.23/77.77, porque hoy mide lo mismo), pero ahora cualquier archivo nuevo que agregue a `src/logic/` entra a la cuenta aunque nadie lo importe desde un test — tal como pide la guía. Todo lo que sigue siendo UI (`Inventory.tsx`, `Authentication.tsx`, `App.js`) queda afuera a propósito: se verifica con interacción real en el e2e del TP7, no con un test sin DOM (lo permite la propia guía: "la UI completa se verifica end-to-end en el TP7, contra la app desplegada de verdad").

## Qué dejé afuera de la cuenta de cobertura, y por qué

- **Backend**: `bin/` (arranque — `www`, `migrate.js`), `app.js` (cableado de middlewares), `database.js` (modelos de Sequelize — las "clases de datos" del §2.4) y, después de la corrección, **`routes/*.js` completo** (arranque/configuración de servicios — ya sin ninguna regla de negocio adentro, ver arriba). Son las dos familias que nombra la guía: arranque y datos — con la salvedad de que "arranque" solo se excluye una vez que no queda lógica real ahí.
- **Frontend**: todo lo que no esté en `src/logic/` — componentes React, `App.js`, `index.tsx`. Es UI, se verifica con e2e en el TP7, no con unit tests sin DOM.

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

**PR que queda abierto y en rojo hasta la defensa** ([#17](https://github.com/JoseRuarte2004/ingsoft3-tp01/pull/17)): `api/utilities/normalizarStorageLocation.js`, sin tests. Se abrió originalmente contra el umbral viejo (25/40, rompía por ramas en 36.08%); después de la corrección de este mismo PR, actualicé su rama contra el nuevo `main` (umbral 85/80) y sigue en rojo — ahora por las **dos** métricas a la vez: `Jest: Coverage for lines (82.53%) does not meet "global" threshold (85%)` y `Jest: Coverage for branches (68.42%) does not meet "global" threshold (80%)` ([run 39458815182](https://github.com/JoseRuarte2004/ingsoft3-tp01/actions/runs/39458815182), `mergeStateStatus: BLOCKED`). **A propósito no se toca más**: queda como la prueba de que el freno funciona sin depender de una captura de pantalla.

## Problemas encontrados y cómo los resolví

- **`jest` no estaba instalado en `api/`** pese a que `"test": "jest"` y `api/database.test.js` ya existían — `npm test` fallaba con `jest: command not found`. Lo encontré corriendo `npm test` antes de escribir nada, no asumiendo que "ya pasaba" porque lo decía `decisiones.md` del TP2.
- **`client/package.json` tenía `"testRunner"` apuntando a una ruta absoluta** de la máquina del autor original del repo open source (`/home/elliot/programming/...`). Rota en cualquier otra máquina. La arreglé apuntando al módulo relativo (`jest-circus/runner`).
- **`api/Dockerfile` no copiaba la carpeta `services/` nueva a la imagen final**: lo detecté corriendo el smoke test completo contra el stack levantado en Docker, no confiando solo en que `npm test` pasara en mi máquina.
- **Los `yarn.lock` se reescribían solos** al correr `npm install`/`npm ci` (aunque el build real usa `npm ci` con `package-lock.json`). Revertí esos cambios para no meter un diff de 20.000 líneas irrelevante.
- **El umbral del backend quedó obsoleto a mitad de semana**: subió la cobertura real por los PRs del gate y dejé de poder romperlo con un archivo chico para la segunda demo. Lo subí una vez (PR #16, 15/25→25/40) y lo terminé de corregir del todo más adelante (ver el punto siguiente).
- **Medí mal la cobertura la primera vez**: dejé `routes/*.js` adentro de la cuenta sin releer con cuidado que la guía (§2.4) las trata como "arranque" a excluir, y mi primer intento de excluirlas habría caído en la trampa que la misma guía describe (dar un número perfecto por esconder lo único sin testear). Lo corregí extrayendo `userService.js` (con tests) antes de excluir rutas, y reestructurando el frontend para medir por carpeta en vez de archivos sueltos — todo contado en detalle arriba, en la sección del umbral.

## Enlaces de este TP

- Suite de unit tests: [PR #13](https://github.com/JoseRuarte2004/ingsoft3-tp01/pull/13)
- Cobertura + etapa de tests en el pipeline: [PR #14](https://github.com/JoseRuarte2004/ingsoft3-tp01/pull/14)
- Demo del gate (mergeado): [PR #15](https://github.com/JoseRuarte2004/ingsoft3-tp01/pull/15) — rojo: [run 39453746457](https://github.com/JoseRuarte2004/ingsoft3-tp01/actions/runs/39453746457) · verde: [run 39454006275](https://github.com/JoseRuarte2004/ingsoft3-tp01/actions/runs/39454006275)
- Primer ajuste del umbral (superado por la corrección de abajo): [PR #16](https://github.com/JoseRuarte2004/ingsoft3-tp01/pull/16)
- **Corrección de la medición de cobertura** (rutas excluidas de verdad, `userService.js` extraído y testeado, frontend medido por carpeta): [PR #19](https://github.com/JoseRuarte2004/ingsoft3-tp01/pull/19)
- Demo del gate (abierto, en rojo hasta la defensa, rebaseado contra la medición corregida): [PR #17](https://github.com/JoseRuarte2004/ingsoft3-tp01/pull/17) — [run 39458815182](https://github.com/JoseRuarte2004/ingsoft3-tp01/actions/runs/39458815182)

## Declaración de uso de IA — TP5

Usé Claude Code para toda la implementación: el diseño de la suite (qué testear y por qué), el refactor de inyección de dependencias, la configuración de cobertura en los dos lados, las etapas de Docker y los PRs de demostración.

Cómo lo verifiqué:
- Antes de escribir un solo test, corrí `npm test` en los dos lados y confirmé con mis propios ojos que los dos fallaban (por motivos distintos) — no asumí que "ya andaban" porque un `decisiones.md` anterior lo decía.
- Después del refactor de `products.js`, corrí un smoke test completo contra el stack real en Docker (registro, login, alta válida 200, alta inválida 400) — eso fue lo que encontró el bug del `Dockerfile` que no copiaba `services/`.
- Calculé a mano cuántas líneas/ramas nuevas hacían falta para que cada PR de demostración realmente rompiera el umbral (no tanteé a ciegas), y medí el resultado real con `npm run test:ci` antes de pushear cada uno.
- Leí el log de cada corrida roja (`gh run view --log`) para confirmar que decía lo que yo esperaba que dijera, no solo que el job estuviera en rojo.
- Cada push y cada merge los aprobé yo explícitamente antes de que se ejecutaran.

**Nota sobre el tag**: `v5.0.0` se cerró originalmente sobre el commit de [PR #18](https://github.com/JoseRuarte2004/ingsoft3-tp01/pull/18) (`a1379fd`). Después de la corrección de cobertura (PRs #19 y #20), moví el tag al commit final (`ae42372`, `git tag -f v5.0.0 && git push -f origin v5.0.0`), como indica el reglamento — así la defensa se navega sobre el punto correcto, no sobre la versión con el error de medición.

**Sobre la corrección de la medición de cobertura** (después de cerrar el TP la primera vez): le pedí a Claude que releyera conmigo las secciones §2.4 y §3.3/§3.4 de la guía para confirmar si mi primera medición estaba bien hecha. Antes de aceptar el cambio, le pedí que midiera primero (sin fijar ningún umbral) y me mostrara los números reales — así fue como apareció el 100%/97% sospechoso del backend, que confirmó que había una trampa real (no hipotética) en mi primera versión. La decisión de extraer `userService.js` en vez de documentar el límite la tomé yo, después de que me mostrara las dos opciones con su costo. Volví a correr el smoke test completo en Docker después del refactor de `users.js`, no confié en que los tests unitarios alcanzaran para confirmar que el registro seguía funcionando.

---

# Decisiones — TP6 (CD: entornos, aprobaciones y deployment patterns)

## Enlaces de este TP

- Paquetes públicos: `ghcr.io/joseruarte2004/ingsoft3-tp01-backend` y `ghcr.io/joseruarte2004/ingsoft3-tp01-frontend`, confirmados con `docker pull` sin sesión.
- La cadena del artefacto:
  1. Corrida de un PR con los tests en verde, "Entrar al registry" salteado: [run 39462721539](https://github.com/JoseRuarte2004/ingsoft3-tp01/actions/runs/39462721539).
  2. Corrida de `main` donde "Construir y publicar la imagen" es el último paso real: [run 39463068022](https://github.com/JoseRuarte2004/ingsoft3-tp01/actions/runs/39463068022) (primer intento falló por el problema 1 de abajo; [run 39465456299](https://github.com/JoseRuarte2004/ingsoft3-tp01/actions/runs/39465456299) la corrida ya con todo arreglado).
- URLs de QA: [front](https://ingsoft3-front-qa-g1m1.onrender.com) · [api](https://ingsoft3-api-qa-q9kf.onrender.com).
- URLs de PROD: [front](https://ingsoft3-front-prod-etlo.onrender.com) · [api](https://ingsoft3-api-prod-62e4.onrender.com).

## El artefacto: el pipeline publica, y solo lo que verificó

Extendí el `ci.yml` del TP4/TP5 (PR [#22](https://github.com/JoseRuarte2004/ingsoft3-tp01/pull/22)) para que, además de testear, publique las dos imágenes a `ghcr.io` etiquetadas con el commit (`sha-<commit>`). El paso que publica es el **último** del mismo job que corre los tests — no hay ningún `if` que diga "si los tests pasaron": está en el orden. Si el `docker run` de los tests devuelve rojo, el job muere ahí y el paso de publicar nunca llega a correr.

**Por qué solo publico en verde, y qué perdería el registry si publicara igual**: la garantía completa son tres eslabones, no uno — (1) nada entra a `main` sin pasar por un PR con el pipeline en verde (TP1+TP4+TP5), (2) solo el evento `push` a `main` publica (el `if` del paso), y (3) el paso que publica es el último del job que corre los tests, así que si fallan, no se llega a él. Si publicara aunque los tests fallaran, el registry dejaría de significar "esto pasó la verificación" y pasaría a ser un depósito de cualquier cosa que alguna vez se construyó — y en el TP7, cuando Render pase a ejecutar la imagen en vez de reconstruir, estaría desplegando algo que nadie garantizó que funcione.

**Problema 1 — el paquete no dejaba escribir al pipeline.** La primera corrida en `main` falló con `denied: permission_denied: write_package`, aunque el job ya declaraba `permissions: packages: write`. Causa: los paquetes `ingsoft3-tp01-backend`/`-frontend` se habían creado en el TP2 con un `docker push` manual (con mi token personal), no desde un workflow — y un paquete así **no queda conectado al repo**: el `GITHUB_TOKEN` automático de las corridas no tiene permiso de escritura sobre él aunque el job lo pida, hasta que alguien lo conecta a mano. Se arregla una sola vez, por paquete, desde *Package settings → Manage Actions access → Add Repository* (rol *Write*) — no hay API pública para esto, es solo desde la web.

**Problema 2 — dónde declarar el permiso, y por qué importa.** Mientras diagnosticaba el problema 1, subí temporalmente el default de `Workflow permissions` del repo (*Settings → Actions → General*) de `read` a `write`, pensando que ahí estaba el límite. No era necesario: una vez conectado el paquete, `permissions: packages: write` **a nivel de job** alcanza solo, y volví el default del repo a `read`. La diferencia es la misma lección del TP4 (mínimo privilegio, pero ahora en dos niveles en vez de uno):
- El default del **repo** es el techo que se aplica cuando un workflow **no** declara `permissions:` — dejarlo en `write` le da permiso de escritura de paquetes a cualquier workflow futuro que no lo declare explícitamente, aunque no publique nada.
- Declararlo **por job** (como ya hacía desde el TP4, por la misma razón) toca solo a los dos jobs que de verdad publican, y es independiente del default del repo.

Verifiqué las dos cosas por separado, no una y asumí la otra: até el problema 1 al mensaje de error exacto (`write_package`, no un 403 genérico de autenticación), y después de arreglar el acceso del paquete, repetí la corrida con el default del repo ya vuelto a `read` y confirmó que publicaba igual — así supe que el permiso por job era, de verdad, el que importaba.

## Los cuatro entornos: Render + Neon

Riel elegido: **Render** (los 4 contenedores, Docker) + **Neon** (Postgres serverless, dos databases — `app_qa` y `app_prod`, mismo proyecto). No usé el Postgres de Render porque su tier gratis expira a los 30 días; el de Neon es permanente con límites de uso, no de tiempo.

Los 4 servicios (todos *Web Service*, runtime Docker, plan Free, **Auto-Deploy en Off** en los cuatro):

| Servicio | Root Directory | Variables |
|---|---|---|
| `ingsoft3-api-qa` | `api` | `DATABASE_URL` (Neon `app_qa`), `SESSION_SECRET`, `COOKIE_PARSER_SECRET` |
| `ingsoft3-front-qa` | `client` | `BACKEND_URL` = URL de `ingsoft3-api-qa`, `DNS_RESOLVER=8.8.8.8` |
| `ingsoft3-api-prod` | `api` | `DATABASE_URL` (Neon `app_prod`), `SESSION_SECRET`/`COOKIE_PARSER_SECRET` **distintos** de los de QA |
| `ingsoft3-front-prod` | `client` | `BACKEND_URL` = URL de `ingsoft3-api-prod`, `DNS_RESOLVER=8.8.8.8` |

**Auto-Deploy en Off es la decisión conceptual clave de esta sección**: Render sabe redesplegarse solo en cada push, pero entonces el deploy no pasaría por el pipeline — ni por el gate del TP4/TP5, ni por la aprobación de PROD que viene en §3.4. El deploy lo tiene que disparar **mi workflow**, no el proveedor.

### Cómo comprobé que las bases son de verdad distintas

No me alcanzó con que las variables dijeran cosas distintas — hice la prueba que pide la guía (§3.1, "el error más silencioso de todo el TP: PROD apuntando a la base de QA"), contra las URLs reales:
1. Registré el usuario `qa-smoke` en QA.
2. Registré el **mismo** `qa-smoke` en PROD — si las bases fueran la misma, hubiera rechazado el registro por username duplicado. Lo aceptó (`User creation successful`): son bases distintas.
3. Con ese usuario logueado en PROD, creé un producto con un nombre inconfundible (`SOY-PROD-UNICO`).
4. Logueado como el mismo usuario en QA, listé productos: solo aparece `Leche QA` (el que ya existía ahí) — `SOY-PROD-UNICO` **no** aparece.

### Problemas encontrados en este bloque

- **Un valor con espacio rompió la plantilla de nginx**: `BACKEND_URL` con algo de más en el campo *Value* de Render generó `set $backend_api ${BACKEND_URL};` con más de dos argumentos para nginx (`invalid number of arguments in "set" directive`). Lo reproduje localmente con un valor con espacio a propósito, confirmé el síntoma exacto, y lo arreglé poniéndole comillas al valor sustituido en la plantilla (`set $backend_api "${BACKEND_URL}";`): con comillas, nginx toma todo el valor como un solo argumento sin importar qué tenga adentro.
- **El mismo tipo de error, dos veces**: el `DATABASE_URL` de `ingsoft3-api-prod` se cargó con el nombre de la variable repetido adentro del valor (`DATABASE_URL=postgresql://...` en vez de solo la URI), lo que rompía el parseo de Sequelize (`Cannot read properties of null (reading 'replace')`, porque `url.parse` no encuentra un protocolo válido al principio de la cadena). Mismo tipo de error de tipeo que el de `BACKEND_URL`, en un campo distinto.
- **Un secreto se pegó en el chat por error** (la contraseña de Neon, en texto plano, pese a que se le había pedido explícitamente que no lo hiciera). Se rotó la contraseña del rol de Neon de inmediato y se actualizó `DATABASE_URL` en Render con la nueva — siguiendo la misma regla que el reglamento pide para cualquier credencial filtrada (§7): rotarla ya y contarlo acá.

## Promoción automática a QA

Job `deploy-qa` en `ci.yml` (PR [#27](https://github.com/JoseRuarte2004/ingsoft3-tp01/pull/27)): `needs: [build-api, build-client]` + `if: github.ref == 'refs/heads/main'` arman la cadena con compuertas — sin CI verde no hay deploy, y un PR nunca despliega (`deploy-qa` sale `SKIPPED` en los PRs, se ve en cualquier corrida de un PR). `environment: qa` hereda los dos secrets de los deploy hooks y suma al historial de *Deployments*.

**Alcance de cada secret**: `RENDER_HOOK_API_QA`/`RENDER_HOOK_FRONT_QA` viven en el environment `qa` y solo los puede leer un job con `environment: qa` — no están disponibles en `build-api`/`build-client` ni en `deploy-prod`. Los de PROD (`RENDER_HOOK_API_PROD`/`RENDER_HOOK_FRONT_PROD`) viven en `production`, y ahí la diferencia es más fuerte que en QA: un job con `environment: production` ni siquiera **arranca** a leerlos hasta que el *required reviewer* aprueba — a diferencia de `qa`, que no tiene reglas de protección. Es el tercer alcance de secrets de la materia (repo → environment → organización, del TP4), aplicado con la distinción que importa acá: "con quién hasta dónde" entre un entorno sin aprobación y uno que la exige.

**El `&ref=$GITHUB_SHA` es la pieza que hace que "se promueve lo mismo que se verificó" sea cierto** y no una frase linda: un hook pelado despliega la punta de la rama, no el commit que el pipeline acaba de testear. Lo comprobé, no lo asumí: después del primer merge real a `main` (commit `2f20031`), `gh api 'repos/.../deployments?environment=qa'` devuelve ese mismo sha como el desplegado — no "lo último de la rama en ese momento", el commit exacto.

El smoke test reintenta 30 veces cada 20s (el contrato del free tier: cold start de Render) y verifica tres cosas por separado: `/health` (proceso vivo), `/health/db` (la base responde — separar esto de `/health` fue a propósito: un `/health` que no toca la base puede dar verde con la connection string rota) y el front servido.

**Limitación honesta**: el deploy hook responde al instante y Render buildea en segundo plano — mientras construye (o si ese build falla), el servicio sigue sirviendo la versión anterior. Como el smoke empieza a chequear apenas se dispara el hook, su primer intento puede encontrar la versión VIEJA todavía respondiendo y dar verde sin que el commit nuevo haya llegado a estar `live` — mi smoke no distingue esos dos casos. No implementé la variante que compara el commit corriendo contra `github.sha` (la guía la marca opcional acá y obligatoria recién en el TP7) — queda como limitación conocida, no escondida.

## El gate humano hacia PROD

Job `deploy-prod` (PR [#29](https://github.com/JoseRuarte2004/ingsoft3-tp01/pull/29)): `needs: deploy-qa` (no repite el `if` de rama — lo hereda de la cadena, así que en un PR ninguno de los dos jobs corre) y `environment: production`, con un **required reviewer** (yo mismo, `prevent_self_review: false` — es lo que permite aprobar los propios deploys, a diferencia de los PRs). `concurrency: { group: deploy-prod, cancel-in-progress: false }` para que dos deploys a PROD no se pisen entre sí.

**Qué miro antes de aprobar** (los criterios del gate, no solo el trámite): que el job `deploy-qa` de esa misma corrida haya terminado en verde (si no, ni siquiera llega a pedir aprobación), que el smoke de QA realmente haya tocado la base (no solo `/health`), y qué cambia ese commit puntual — si toca algo sensible (auth, conexión a la base, cobertura/umbral), lo miro con más cuidado que un cambio de texto.

### Evidencia del flujo completo

1. **Rechazo** ([run 39492950044](https://github.com/JoseRuarte2004/ingsoft3-tp01/actions/runs/39492950044)): `deploy-qa` verde, `deploy-prod` quedó `Waiting for review`, lo rechacé con un motivo propio y específico de esa corrida — "quiero revisar el smoke de QA de este merge antes de avanzar a PROD" (no el ejemplo de la guía). Confirmado por API: `gh api .../approvals` devuelve `{"state":"rejected","comment":"quiero revisar..."}`, y el job `deploy-prod` quedó en `conclusion: failure` — la máquina obedeció al rechazo.
2. **Cambio real para la aprobación**: PR [#30](https://github.com/JoseRuarte2004/ingsoft3-tp01/pull/30), traduce el título de la pantalla de inventario ("Inventory" → "Mi Inventario") — un cambio de **código**, no un comentario del YAML, para poder mostrar en la defensa que lo que se aprueba de verdad llega a la pantalla.
3. **Aprobación** ([run 39494151426](https://github.com/JoseRuarte2004/ingsoft3-tp01/actions/runs/39494151426)): aprobado, `deploy-prod` en verde. Verifiqué dos cosas, no me quedé con el check verde del pipeline:
   - `gh api 'repos/.../deployments?environment=production'` devuelve el sha `72ac1b1` — el mismo commit del merge, no "lo último que había en `main`" en ese momento.
   - El bundle JS que sirve `https://ingsoft3-front-prod-etlo.onrender.com` contiene literalmente el string `"Mi Inventario"` — el cambio aprobado está, de verdad, en la pantalla.

**Dos corridas esperando aprobación a la vez — lo viví, no lo imaginé.** Mientras cerraba este bloque, un PR de documentación (#31) y el cambio real del rollback (#32) quedaron los dos esperando revisión, con el `concurrency: group: deploy-prod` reteniendo el lugar: la corrida de #31 estaba `waiting` y la de #32 quedó `pending`, en cola detrás. Es exactamente el escenario que describe la guía (§3.4) y por el que advierte que el `concurrency` **no resuelve** este caso (no hay nada "en cola" que cancelar: una corrida esperando aprobación humana no es una corrida esperando un runner). Lo resolví como indica: **rechacé a mano la corrida vieja** (#31, con motivo: *"solo cambios en decisiones.md, prefiero aprobar directamente el cambio real de PR #32"*), y recién ahí la de #32 pasó a `waiting` y pude aprobarla.

## Continuous Delivery vs Continuous Deployment

Implementé **Continuous Delivery**, no Continuous Deployment: todo cambio que pasa CI llega automático a QA, pero a PROD solo llega con una aprobación humana explícita (el *required reviewer* del environment `production`). Para mi contexto (un repo individual, sin un equipo de QA ni monitoreo/observabilidad todavía — eso recién llega en el TP9) tiene sentido que haya un humano mirando antes de PROD: hoy no tengo alertas automáticas ni métricas que me avisen solas si algo sale mal después de un deploy, así que la revisión manual es la única red de seguridad real que existe antes de que un cambio le llegue a un usuario. Pasar a Continuous Deployment (sacar la aprobación) recién tendría sentido si antes subo la cobertura de e2e (TP7) y sumo observabilidad real (TP9) — hoy sería automatizar la propagación de errores, no la entrega.

## La letra chica del free tier, y cómo la maneja mi pipeline

- **Render**: 750 horas de instancia por mes **por workspace** (las consumen los 4 servicios juntos — duermen solos a los ~15 min sin tráfico, así que en la práctica no se gastan todas) y 500 minutos de build por mes (cada promoción completa reconstruye 4 veces: api y front, QA y PROD). Mi pipeline no hace nada especial contra esto más que no desperdiciar builds: el cache de capas del TP4/TP5 (`type=gha`) ya evita reconstruir capas que no cambiaron en el **pipeline**; lo que Render reconstruye del lado suyo (§3.2) es aparte y no lo puedo cachear desde acá.
- **Cold start**: el primer request a un servicio dormido tarda hasta ~1 minuto. Por eso el smoke test de `deploy-qa`/`deploy-prod` reintenta 30 veces cada 20s (10 minutos de margen) en vez de un solo `curl` seco, que daría falso rojo cada vez que un servicio esté dormido.
- **Neon**: el cómputo se suspende a los ~5 min idle (se despierta solo y más rápido que Render) y hay límite de almacenamiento (0.5GB) y de horas de cómputo mensuales — no lo medí en profundidad porque mi app es chica y no debería acercarse al límite en lo que dura la cursada.

## Qué garantía pierdo porque Render reconstruye en vez de ejecutar mi imagen

Esto está mal a propósito en este TP (lo marca la guía en mayúsculas, §3.2) y lo entiendo así: mi pipeline publica la imagen que **mis tests aprobaron** (§"El artefacto" arriba), pero el deploy hook de Render le pide que la **reconstruya desde el repositorio** — es una build distinta, del mismo commit, no la misma imagen. Puede salir igual… o no: una dependencia que cambió de versión entre un build y el otro (sin que yo haya tocado `package-lock.json`, por ejemplo si cambia algo en el registry de npm), una imagen base (`node:20.18-alpine`) que se actualizó con un patch de seguridad entre los dos builds. "Se promueve lo mismo que se verificó" (§2.3) queda roto en un sentido estricto: promuevo el mismo **commit**, no la misma **imagen**. Convertir esto en una garantía real — que Render ejecute la imagen que el pipeline publicó, no que la reconstruya — es exactamente lo que resuelve el TP7.

## Qué prueba mi smoke test, y qué no

**Prueba**: que el proceso está arriba (`/health`), que la base responde (`/health/db` — separado a propósito de `/health`, porque un health check que no toca la base puede dar verde con la connection string rota) y que el front sirve contenido. Reintenta 30 veces por el cold start del free tier.

**No prueba**: qué commit es el que está respondiendo. `/health` devuelve `{"status":"ok"}`, no un sha — así que si el deploy hook disparó la reconstrucción pero Render todavía está sirviendo la versión anterior (build en curso o fallido), mi smoke puede dar verde contra la versión VIEJA sin que yo me entere (documentado arriba, en "Promoción automática a QA"). Tampoco prueba nada del **contenido** de la respuesta más allá del código 200 — no verifica, por ejemplo, que el front muestre el texto que se supone que cambié; eso lo comprobé a mano (grep sobre el bundle) para la evidencia de aprobación, no lo hace el pipeline solo.

## Estrategia de deployment para una producción real, y plan de rollback (Tarea 6)

**Qué patrón usaría con usuarios reales**: **blue-green**. Mi app es chica (un monolito de dos contenedores, sin estado compartido entre instancias más que la base) y blue-green da rollback **instantáneo** (cambiar a qué entorno apunta el router) contra el costo de mantener el doble de infraestructura corriendo — un costo que para una app de este tamaño es bajo. Descarté **canary** porque pide observabilidad que hoy no tengo (recién llega en el TP9: sin métricas que digan "el canario está sangrando", repartir tráfico entre dos versiones es timear a ciegas) y **rolling** porque con solo 1 instancia por servicio en el free tier no hay "de a tandas" que hacer. **Feature flags** los usaría para una funcionalidad de verdad riesgosa (ej. cambiar cómo se calcula el vencimiento de productos) — desplegarla apagada y prenderla por mí mismo antes que por todos los usuarios a la vez, desacoplando el deploy del release.

**Mi plan de rollback actual (medido, no estimado)**: disparar los mismos deploy hooks de PROD con `&ref=<sha-del-deploy-bueno-anterior>` en vez de `$GITHUB_SHA` — el mismo mecanismo que usa el pipeline, a mano. Lo hice de verdad una vez, de `ce628fb` de vuelta a `72ac1b1` (el commit del merge de PR #30, aprobado en el gate humano — ver la nota al final de esta sección: `v6.0.0` después se movió a otro commit):

| Servicio | Deploy started | Deploy live |
|---|---|---|
| `ingsoft3-api-prod` | 20/10, 7:13 PM | 20/10, 7:14 PM |
| `ingsoft3-front-prod` | 20/10, 7:13 PM | 20/10, 7:14 PM |

Fuente: *Events* de cada servicio en Render (la pestaña que se mira en la defensa). Esa vista da precisión de **minuto**, no de segundo — por eso el número oficial queda como "menos de dos minutos" (arrancó a las 7:13, los dos servicios ya estaban `live` a las 7:14). Como complemento, verifiqué el mismo rollback desde afuera con mi propio reloj: disparé los hooks a las **19:13:41** y confirmé el front sirviendo la versión vieja (el texto en inglés, de antes del cambio que estaba revirtiendo) a las **19:14:38** — **~57 segundos**, coherente con la ventana que marca Render. Más rápido de lo que esperaba para un rebuild completo; probablemente porque Render ya tenía cacheadas las capas de ese commit, al haberlo construido antes.

**Lo que este rollback NO deshace**: los datos. Si el deploy que estoy revirtiendo hubiera corrido una migración que borra una columna, esa columna sigue borrada — el código vuelve atrás, la base no. En mi app no corrí ninguna migración destructiva todavía, así que no lo golpeé en la práctica, pero es la respuesta que importa poder dar: un rollback de código es reversible, uno de esquema de base casi nunca lo es sin un plan aparte (backup, migración inversa escrita a mano).

## Declaración de uso de IA — TP6

Usé Claude Code para toda la implementación: el `ci.yml` extendido (publicación, `deploy-qa`, `deploy-prod`), la plantilla de nginx, los endpoints de `/health`, y la creación de los environments de GitHub por API.

Cómo lo verifiqué, y un incidente real:
- Cada servicio de Render lo creé yo mismo desde la web, pegando los valores de Neon y generando los secretos.
- **Un secreto se filtró una vez**: pegué la contraseña de Neon en el chat con la IA por error (documentado arriba, en "Los cuatro entornos"). La roté de inmediato. De ahí en adelante, todos los secretos (deploy hooks, connection strings) los cargué **solo yo**, directo del navegador a la terminal o a Render, sin que pasaran por el chat.
- Cuando el front de QA falló por el error de nginx, le pedí a la IA que reprodujera el síntoma localmente con Docker antes de aceptar su diagnóstico ("un valor con espacio rompe el `set`") — lo hizo con un caso que fallaba igual y uno que no, y recién con esa evidencia acepté el fix.
- El rechazo y la aprobación de PROD los hice yo, desde la web de GitHub — son literalmente el ejercicio de criterio humano que pide el TP, no algo que tuviera sentido delegar.
- El rollback lo disparé yo mismo desde mi terminal, pegando el deploy hook con `read -rs` para que no quedara en el historial — la IA nunca tuvo ni pidió ver ese valor.
- Verifiqué cada paso crítico desde **afuera** del pipeline (un `grep` sobre el bundle público, la API de Deployments, los *Events* de Render) en vez de confiar en que un check verde alcanzara.

**Nota sobre el tag**: `v6.0.0` se cerró originalmente sobre `72ac1b1` (el commit del merge de PR #30, aprobado en el gate humano). Después de medir el rollback (sección anterior), aprobé un `deploy-prod` más para el commit de cierre del TP6 (PR #33, solo cambios en `decisiones.md` y la release — sin tocar código de la app), y PROD quedó corriendo sobre `7b96c87`. Esto rompe la regla que me había puesto de no aprobar deploys de PRs de documentación fuera del cierre explícito de un TP, y lo cuento tal cual, sin esconderlo. Como el contenido entre los dos commits es solo documentación y el reglamento (§3) permite mover un tag ya puesto siempre que se cuente en `decisiones.md`, moví `v6.0.0` a `7b96c87` (`git tag -f v6.0.0 && git push -f origin v6.0.0`) — el mismo criterio que ya usé para `v5.0.0` — para que el tag coincida con lo que de verdad corre en PROD según *Deployments*. De acá en adelante, si un `deploy-prod` queda esperando aprobación y no es el cierre explícito de un TP, lo reviso con más cuidado antes de aprobarlo.

---

# Decisiones — TP9 (DevSecOps + Observabilidad)

## Enlaces de este TP

- `dependabot.yml` (3 ecosistemas: `npm` en `api/`, `npm` en `client/`, `github-actions` en `/`): [PR #35](https://github.com/JoseRuarte2004/ingsoft3-tp01/pull/35)
- PR de Dependabot analizado y mergeado: [PR #36](https://github.com/JoseRuarte2004/ingsoft3-tp01/pull/36) (`actions/checkout` 6→7)
- Sentry en backend y frontend: [PR #52](https://github.com/JoseRuarte2004/ingsoft3-tp01/pull/52)
- Endpoint temporal `/falla` (práctica §3.5): [PR #53](https://github.com/JoseRuarte2004/ingsoft3-tp01/pull/53) → sacado en [PR #55](https://github.com/JoseRuarte2004/ingsoft3-tp01/pull/55)
- Corrección del tag `v6.0.0` (hallazgo del arranque de este TP): [PR #34](https://github.com/JoseRuarte2004/ingsoft3-tp01/pull/34)
- Issue + tarjeta del tablero (dato real de Sentry): [issue #54](https://github.com/JoseRuarte2004/ingsoft3-tp01/issues/54), en el [Project público](https://github.com/users/JoseRuarte2004/projects/1)
- Monitor de UptimeRobot: `https://ingsoft3-api-prod-62e4.onrender.com/health`, intervalo 5 min, pausado tras el ciclo DOWN/UP (ver abajo)

## Dependabot: qué PR mergeamos, y por qué

A los pocos segundos de mergear `dependabot.yml` ya había 5 PRs abiertos en los tres ecosistemas — mucho más rápido que lo que avisa la guía ("a veces tarda horas"). Le pedí a **Claude Code** que analizara esos cinco (changelog real de cada paquete/acción, no solo el número de versión) antes de elegir cuál mergear para el checkpoint:

| PR | Qué actualiza | SemVer | Por qué lo descartamos (por ahora) |
|---|---|---|---|
| #37 `actions/upload-artifact` 6→7 | Acción del pipeline | Major | No se analizó a fondo — dejamos uno solo del lote de actions para no mezclar dos análisis en la misma entrega |
| #38 `morgan` 1.9.1→1.12.1 (`api/`) | Logging HTTP | Minor | Toca código de la app; lo dejo para una vuelta con más tiempo de revisión |
| #39 `cookie-parser` 1.4.5→1.4.7 (`api/`) | Parseo de cookies | Patch | Candidato razonable, pero #36 era más fácil de defender sin ambigüedad |
| #40 `cookie-session` 1.4.0→2.1.1 (`api/`) | **Sesiones/login** | **Major** | Riesgo real: un salto de mayor a mayor en la librería que maneja la sesión necesita probar el login de punta a punta, no solo un check verde — lo dejo para cuando tenga tiempo de testearlo a mano |

Con ese análisis sobre la mesa, **elegí yo** [PR #36](https://github.com/JoseRuarte2004/ingsoft3-tp01/pull/36) (`actions/checkout` de 6 a 7, **major** según su propio versionado):
- **No toca código de la app** — es una acción del pipeline (`ci.yml`), no una dependencia de `api/` ni `client/`: si algo saliera mal, rompe el CI, no la aplicación en producción.
- **El changelog de la v7** (lo buscó y leyó Claude Code, con una búsqueda web, porque GitHub no publica el CHANGELOG.md completo en la propia página del PR): el único cambio que rompe algo es que bloquea el checkout de forks en eventos `pull_request_target`/`workflow_run` (hardening de seguridad, no un bug). Verifiqué yo mismo el dato clave antes de confiar en el resumen: `grep` sobre `.github/workflows/ci.yml` confirma que mi pipeline solo dispara con `pull_request` y `push` (línea 4 y 6) — ningún job mío usa esos dos triggers, así que ese breaking change no me toca.
- El pipeline ya estaba **verde** sobre la rama del PR antes de mergear (run [39511461705](https://github.com/JoseRuarte2004/ingsoft3-tp01/actions/runs/39511461705)) — y ese verde es todo mi semestre (TP4/TP5) diciéndome que podía mergear con confianza.

Claude Code ejecutó el merge (`gh pr merge 36 --squash --delete-branch`) después de que yo eligiera esa opción explícitamente entre las que me presentó.

## Las 650 vulnerabilidades: qué son de verdad, y qué no

Al prender las alertas, GitHub reportó 650 alertas abiertas en `main` (47 críticas, 330 altas, 218 moderadas, 55 bajas). Antes de asumir que eso son 650 problemas reales en lo que corre en PROD, le pedí a Claude Code que las bajara por API (`gh api repos/.../dependabot/alerts --paginate`) y las cruzara por `scope` (`runtime`/`development`, según cómo está declarada cada dependencia en su `package.json`) y por `manifest` (el lockfile donde aparece cada alerta). Resultado, verificado por mí contra la API, no asumido:

| Manifest | Alertas abiertas | De las cuales `runtime` |
|---|---|---|
| `api/package-lock.json` | 161 | 155 (6 son `development`) |
| `api/yarn.lock` | 163 | 157 (6 son `development`) |
| `client/package-lock.json` | 97 | 97 |
| `client/yarn.lock` | 229 | 229 |

**El primer hallazgo real**: ninguno de mis dos `Dockerfile` usa `yarn` — lo confirmé con `grep -rn "yarn" api/Dockerfile client/Dockerfile .github/workflows/ci.yml`, sin ningún resultado. Los dos instalan con `npm ci` leyendo `package-lock.json` (`api/Dockerfile:9,24`, `client/Dockerfile:10`). El `yarn.lock` es un resto del repo heredado (ya lo noté en el TP5: "los `yarn.lock` se reescribían solos al correr `npm install`/`npm ci`, aunque el build real usa `npm ci` con `package-lock.json`") que ningún paso del build toca. Eso saca **392 de las 650 alertas** (163 + 229) de la cuenta de "lo que corre de verdad": están sobre un archivo que nadie lee para construir nada.

De las **258 que quedan** (sobre `package-lock.json`, el lockfile que de verdad se instala):
- **`api/` (161, de las cuales 155 `runtime` y 6 `development`)**: mi `api/Dockerfile` tiene una etapa separada (`prod-deps`, línea 24) que instala con `npm ci --omit=dev` para la imagen final — las `devDependencies` nunca llegan a la imagen que corre en QA/PROD. Quedan **155 alertas sobre paquetes que sí están instalados en el backend corriendo ahora mismo** (de esas 155: 9 críticas, 80 altas, 52 moderadas, 14 bajas — confirmado filtrando la misma API por `scope=runtime` y `manifest=api/package-lock.json`).
- **`client/` (97, todas `runtime`)**: mi `client/Dockerfile` no copia ningún `node_modules` a la imagen final — la etapa de nginx solo sirve el bundle estático que produjo `npm run build` (`COPY --from=build /app/build`, línea 26). No hay ningún proceso Node corriendo en el contenedor de frontend que tenga estos 97 paquetes instalados. **Lo que no verifiqué, y por eso no lo afirmo**: si el código vulnerable de cada uno de esos paquetes terminó o no empaquetado dentro del JS que de verdad baja al navegador — depende de si la app lo importa, paquete por paquete, y no lo revisé uno por uno.

**Por qué no las arreglé todas en este TP**: la tarea pide activar Dependabot y mergear **un** PR analizado, no una limpieza completa de 650 alertas — y, como muestra la tabla, una parte grande de ese número ni siquiera corresponde a algo que se instale en un build real. El número que de verdad me importa seguir de cerca es el de **155** (backend, `runtime`, en la imagen que corre en QA/PROD): ahí es donde un PR de Dependabot mergeado de verdad baja el riesgo, y es la cola de trabajo que dejo para después de esta entrega (empezando por las 9 críticas).

## Problemas encontrados y cómo los resolví (hasta ahora)

- Cada `push`/merge a `main` dispara `deploy-qa` (automático) y `deploy-prod` (esperando aprobación), aunque el cambio sea solo documentación o `dependabot.yml`. El commit `82673f3` (el fix de la nota del tag) lo rechacé yo mismo por API, antes de pedirle nada a Claude Code sobre esto. Los commits `ff86cc0` (merge de `dependabot.yml`) y `cd28d44` (merge de la nota de Dependabot en este mismo archivo) también quedaron esperando — le pedí a Claude Code que los rechazara por API con el mismo motivo ("cambios de configuración y documentación del TP9; el próximo deploy a PROD es el de Sentry, que cierra el TP9"), lo ejecutó, y confirmó por API que no quedó ninguno pendiente. La regla que me había puesto en el TP6 ("PROD tiene que seguir en `v6.0.0`") queda reemplazada por esta: el próximo `deploy-prod` que apruebo es el de Sentry, y `v9.0.0` se etiqueta sobre ese commit.

## Declaración de uso de IA — TP9 (hasta ahora)

Usé Claude Code para: escribir `.github/dependabot.yml`, buscar y leer el changelog de los 5 PRs de Dependabot antes de que yo eligiera cuál mergear, ejecutar ese merge y los rechazos de `deploy-prod` por API, y bajar/cruzar las 650 alertas de Dependabot por `scope` y `manifest`.

Cómo lo verifiqué:
- Las alertas y las security updates de Dependabot las prendí por API (`vulnerability-alerts`, `automated-security-fixes`) y confirmé yo mismo, leyendo la respuesta de cada endpoint, que quedaron activas — no asumí que el comando "debía haber funcionado".
- Antes de aceptar la lectura del changelog de `actions/checkout` v7, le pedí que confirmara el dato clave contra mi propio repo (qué triggers usa mi `ci.yml`) — no contra la documentación en general, sino contra el archivo real.
- El desglose de las 650 vulnerabilidades lo pedí específicamente "con los números reales" y "sin afirmar nada que los números no confirmen" — y antes de aceptar la conclusión de que el `yarn.lock` no importa, pedí el `grep` que lo prueba (que ningún Dockerfile ni el pipeline lo lean), no me quedé con la explicación sola.
- Elegí yo cuál de los 5 PRs de Dependabot mergear, entre las opciones que me presentó con su análisis — no delegué esa decisión.
- Los rechazos de `deploy-prod` que no son el cierre de un TP: decidí yo la regla (no aprobar fuera del cierre de un TP) y el motivo exacto; Claude Code los ejecutó por API cuando se lo pedí.

## Sentry: cómo se instaló, y tres problemas reales que aparecieron

Backend: `@sentry/node`, inicializado en `api/instrument.js` (requerido como la primera línea de `api/bin/www`, antes de `require("../app")`, para que el SDK pueda instrumentar automáticamente lo que se importa después) y con `Sentry.setupExpressErrorHandler(app)` al final de `api/app.js`, después de todas las rutas. Frontend: `@sentry/react`, inicializado en `client/src/index.tsx`. Los dos DSN los creé yo (dos proyectos en Sentry, back y front) y los pasé por el chat — el del front va escrito en el código a propósito (no es secreto: solo permite *enviar* datos, no leerlos, y cualquier app web lo expone igual en el JS que baja al navegador); el del back se carga como variable de entorno `SENTRY_DSN` en Render (si la variable no está, el SDK queda inactivo solo).

Antes de armar el PR, le pedí a Claude Code que probara el build real (con Docker, el mismo `node:18.20-alpine`/`node:20.18-alpine` que usa el pipeline, no su máquina) y los tests — no que asumiera que "agregar una librería" funciona porque `npm install` no tiró error. Eso encontró tres problemas reales:

1. **Conflicto de peer dependency**: `@sentry/react` pide `react-router` 6 a 8 como peer *opcional* (solo si se usa su integración de tracing con el router, que no uso). Mi app sigue en `react-router-dom` 5, así que `npm ci` —a diferencia de `npm install`— lo trata como error y no instala nada. Solución: `--legacy-peer-deps` en el `RUN npm ci` del `client/Dockerfile`, documentado con un comentario ahí mismo explicando por qué es inofensivo en mi caso.
2. **Mi webpack (v4, heredado del TP2) no entendía sintaxis moderna de terceros**: `@sentry/core` y una dependencia suya (`web-vitals`) usan `?.`, `??` y class fields. El babel que procesa `node_modules` (`client/config/webpack.config.js`) usa `@babel/preset-env` sin `targets` propio, así que toma el `browserslist` del proyecto (navegadores modernos) y decide que esa sintaxis no necesita transformarse — pero el parser interno de webpack 4 no la entiende igual, aunque el navegador sí. Antes de fijarlo lo reproduje dos veces (una por cada paquete que fallaba) para confirmar que era el mismo patrón y no dos bugs distintos. Solución: forcé `targets: 'ie 11'` en esa regla puntual (solo afecta cómo se transforma el código de terceros, no el mío) en vez de agregar plugins sueltos — así cubre esto y cualquier sintaxis moderna que traiga otro paquete más adelante, no solo estos dos operadores.
3. **El `Dockerfile` del backend no copiaba `instrument.js` a la imagen final** — mismo tipo de error que ya pasó en el TP5 con `services/` (el `Dockerfile` final solo copia carpetas/archivos puntuales, y hay que acordarse de sumar cada archivo nuevo). Lo encontré corriendo el contenedor final de verdad (`docker run`), no confiando en que `docker build` sin errores significara que arrancaba.

**Efecto secundario que quiero dejar anotado**: agregar `@sentry/react` con `--legacy-peer-deps` forzó regenerar `client/package-lock.json` desde cero (el lockfile viejo no era compatible con la resolución nueva), lo que de paso actualizó versiones de varias dependencias transitivas dentro de los rangos que ya permitía `package.json` — no fue un cambio dirigido, es un efecto del regenerado. Lo verifiqué así: corrí el build de las 3 etapas de los dos `Dockerfile` completos, los tests de los dos lados (backend 100/97.5%, frontend 88.23/77.77% — iguales que antes, ningún umbral se movió) y levanté el stack completo con `docker compose` (con y sin `SENTRY_DSN` en el backend) para confirmar que arranca y que `/health`/`/health/db` siguen respondiendo.

## Declaración de uso de IA — TP9 (Sentry)

Usé Claude Code para instalar los dos SDKs, escribir `instrument.js`, cablear el error handler, y diagnosticar y arreglar los tres problemas de arriba. Cómo lo verifiqué:
- Le pedí explícitamente que probara todo dentro de Docker con las mismas imágenes base que usa el pipeline, no en su entorno local — fue así como aparecieron los problemas 1 y 2 (en su máquina, con una versión de Node mucho más nueva, ni siquiera llegaba a ese punto por otro error de OpenSSL sin relación).
- Antes de aceptar el fix del problema 2, le pedí que explicara por qué pasaba (no solo que "funcionó al agregar esto") — la explicación de `targets`/`browserslist`/el parser viejo de webpack 4 es la que está arriba, y la entendí antes de aprobarla.
- Confirmé yo mismo, leyendo la salida, que el DSN del front terminó de verdad en el bundle servido por la imagen final (`curl` sobre el JS compilado) y que el backend arranca y responde `/health` tanto con `SENTRY_DSN` cargado como sin él.
- Los dos DSN los generé yo en mi cuenta de Sentry; se los pasé por el chat porque ninguno de los dos es un secreto real (ver más arriba).

## Lo que vi en Sentry, con datos reales

Después de aprobar el `deploy-prod` con Sentry activo, usé la app en PROD (registro, login, dos altas de producto, cinco listados) y llamé dos veces a un endpoint temporal que falla a propósito (`GET /falla`, agregado solo para esto — [PR #53](https://github.com/JoseRuarte2004/ingsoft3-tp01/pull/53), sacado después en [PR #55](https://github.com/JoseRuarte2004/ingsoft3-tp01/pull/55)).

- **El error**: aparece en *Issues* como `INGSOFT3-API-1` ("Falla de prueba del TP9", `Unhandled`, bajo `GET /falla`).
- **La más usada**: `GET /products`, con 5 pedidos (los únicos 5 que mandé a esa ruta — se nota comparando *Time Spent* (817.56ms) contra el *P50* (155.53ms): 817.56 ÷ 155.53 ≈ 5).
- **La más lenta**: `POST /users/register`, P95 **2.65s** — más que `GET /health/db` (2.22s) y bastante más que `POST /users/login` (P50 824ms, misma ruta de auth, también usa `bcrypt`). Sospecho que no es (solo) el hash: `health/db` no hashea nada y midió casi lo mismo en su primer pedido — es la letra chica del free tier (cold start de Render/Neon, ya documentada en el TP6) sumándose al costo real de `bcrypt`. Con un solo pedido medido no puedo separar cuánto es cada cosa — lo dejé como [issue #54](https://github.com/JoseRuarte2004/ingsoft3-tp01/issues/54), con el plan concreto para confirmarlo (mandar varios registros seguidos y comparar el primero contra el resto).
- **Tarjeta del tablero**: [GitHub Project público "YourInventoryManager — Tablero (TP3/TP9)"](https://github.com/users/JoseRuarte2004/projects/1), con el issue #54 agregado como tarjeta.

## Monitor externo (UptimeRobot): la caída provocada, medida de verdad

Monitor HTTP(s) sobre `https://ingsoft3-api-prod-62e4.onrender.com/health`, intervalo 5 minutos (el mínimo del plan free). Antes de crearlo comprobé que el endpoint contesta a `HEAD` (`curl -I`, `200`) — el problema que la guía avisa que le pasó a la app de la cátedra no me tocó.

**La caída, con mi propio reloj como testigo** (no solo el historial del panel):
- **13:48:12 UTC**: confirmé por `curl` externo que `/health` ya devolvía `503` — el servicio estaba suspendido de verdad.
- El mail de **DOWN** llegó dentro de la ventana de 5 minutos que promete el plan gratuito (lo confirmé yo mismo revisando la bandeja; no anoté el minuto exacto del mail, solo que entró en esa ventana).
- **13:50:33 UTC**: después de reanudar el servicio desde Render y abrir `/health` una vez a mano (para despertarlo), un `curl` externo ya devolvía `200` — **2 minutos 21 segundos** después del `503` confirmado. Esa misma respuesta tardó 24.9s en completarse (el cold start del primer pedido después de reanudar).
- El mail de **UP** de UptimeRobot llegó después de eso (su propio chequeo corre cada 5 minutos, independiente de que el servicio ya estuviera vivo).

**Por qué separo las dos mediciones**: "cuánto tardó en volver a estar vivo" (2m21s, medido por mí) y "cuánto tardó el monitor en decírmelo" (acotado por su propio intervalo de chequeo, no instantáneo) son datos distintos — el segundo depende del intervalo que paga el plan, no de qué tan rápido reaccioné yo. Monitor **pausado** apenas confirmé el UP, para no consumir las 750 horas compartidas de Render (TP6/TP8).

## Declaración de uso de IA — TP9 (cierre: monitor y tablero)

La cuenta de UptimeRobot, el monitor, el Suspend/Resume de Render y la lectura de los mails de DOWN/UP los hice **yo**, desde los paneles web correspondientes — es la parte de criterio humano que no tenía sentido delegar (igual que el gate humano del TP6). Le pedí a Claude Code que confirmara por `curl` externo, en paralelo, cuándo el servicio realmente dejó de responder y cuándo volvió — así el tiempo que quedó anotado arriba no depende solo de mi lectura del reloj del mail, sino de una medición externa verificable.

El Project de GitHub (`gh project create`) y el issue #54 con el dato de Sentry los armó Claude Code por mí, después de que yo autorizara el scope (`gh auth refresh -s project`) — el contenido del issue (qué se midió, por qué sospecho que es cold start y no solo `bcrypt`, y el plan para confirmarlo) lo revisé antes de que quedara público.

## CodeQL: activado, y los 3 hallazgos del primer análisis

*Settings → Advanced Security → Code Security → CodeQL analysis → Default* (por API, `PATCH code-scanning/default-setup`, lenguajes `javascript-typescript` + `actions` — el análisis de mis propios workflows). Primer análisis: [run 39612510550](https://github.com/JoseRuarte2004/ingsoft3-tp01/actions/runs/39612510550), verde, visible en *Security → Code scanning*.

Encontró 3 alertas, de 2 categorías — analicé las dos:

1. **`actions/missing-workflow-permissions`** (×2, en `deploy-qa` y `deploy-prod` de `ci.yml`) — exactamente el hallazgo que la guía avisa que "vas a ver casi seguro". Ninguno de los dos jobs declaraba `permissions:` propio, así que corrían con el default del repo (`read`, desde el Paso 0). No era explotable de verdad hoy — pero es el mismo argumento del TP4 (`enforce_admins`, mínimo privilegio): no quiero que el día de mañana otro job nuevo, sin querer, herede más permiso del que necesita solo porque el repo cambió su default. **Fix real**: agregué `permissions: { contents: read }` explícito a los dos (ninguno hace ni falta `checkout`, pero es el piso sensato — igual que recomienda la guía).
2. **`js/stack-trace-exposure`** (`api/routes/products.js:67`, categoría OWASP: exposición de información / CWE-209) — `response.status(500).send(JSON.stringify(error))` manda el objeto `Error` completo al cliente. Con Sequelize, ese objeto puede traer el mensaje de SQL, nombres de columnas, y a veces fragmentos de la query — información interna que un atacante no necesita ver. **Sí es explotable de verdad**: lo reproduje a mano (un `PUT` con un tipo de dato inválido) y, hasta el fix, la respuesta mostraba el error crudo. CodeQL marcó solo esa línea, pero el mismo patrón se repetía **6 veces** (5 en `products.js`, 1 en `users.js`) — **fix real en las 6**: mensaje genérico al cliente (`{"error": "Internal server error"}`) + `Sentry.captureException(error)` antes de responder, así el error sigue viéndose en Sentry (antes, como estos routes lo atajaban con su propio `try/catch`, ni siquiera llegaba al `setupExpressErrorHandler` de `app.js` — quedaba invisible para Sentry también).

No hice el ejercicio de "provocar un hallazgo didáctico": no hizo falta, los 3 ya eran reales.

### Declaración de uso de IA — TP9 (CodeQL)

Activé CodeQL yo, pidiéndole a Claude Code que lo hiciera por API (mismo criterio que Dependabot: configuración, no juicio). El análisis de **por qué** cada hallazgo importa y si era explotable lo hizo Claude Code primero, mostrándome el código real (`sed`/`grep` sobre el archivo, no una descripción genérica) y reproduciendo el camino de error con un `curl` real antes de tocar nada — recién ahí decidí que los dos valían la pena arreglar de verdad, no solo documentar. Verifiqué el fix corriendo los 26 tests del backend (sin cambios, porque `routes/*.js` queda afuera de la cuenta de cobertura — ver TP5) y un smoke test end-to-end en Docker (registro, login, alta y listado de producto, y el camino de error mostrando el mensaje genérico en vez del stack trace) antes de aprobar el PR. Las 3 alertas quedaron en `fixed` después del siguiente análisis (confirmado por API, `code-scanning/alerts`).

## Cierre del TP9: tabla contra la consigna

| Tarea | Estado | Evidencia |
|---|---|---|
| 1. Dependabot activo (3 ecosistemas) + alertas/security updates prendidas + 1 PR mergeado | ✅ | [PR #35](https://github.com/JoseRuarte2004/ingsoft3-tp01/pull/35) (`dependabot.yml`), [PR #36](https://github.com/JoseRuarte2004/ingsoft3-tp01/pull/36) (mergeado y analizado) |
| 2. CodeQL activo, primer análisis terminado, visible en Security → Code scanning | ✅ | [run 39612510550](https://github.com/JoseRuarte2004/ingsoft3-tp01/actions/runs/39612510550), 3 alertas encontradas y corregidas ([PR #56](https://github.com/JoseRuarte2004/ingsoft3-tp01/pull/56)) |
| 3. Push protection verificada activa | ✅ | `security_and_analysis.secret_scanning_push_protection.status: "enabled"` (API) |
| 4. Monitor externo sobre `/health` de PROD, DOWN+UP en el historial, pausado al terminar | ✅ | Suspend/Resume de Render + mails de DOWN/UP confirmados; caída real medida en 2m21s (curl externo); monitor pausado |
| 5. Sentry en back y front, ≥1 error, tabla de uso real, tarjeta en el tablero | ✅ | Issue `INGSOFT3-API-1` en Sentry; `GET /products` la más usada, `POST /users/register` P95 2.65s la más lenta; tarjeta = [issue #54](https://github.com/JoseRuarte2004/ingsoft3-tp01/issues/54) en el [Project público](https://github.com/users/JoseRuarte2004/projects/1) |
| 6. Release `v9.0.0` | ✅ | Tag sobre `f183222` (el commit real que corre en PROD, con el fix de CodeQL incluido) |

**Commit de cierre**: `f183222` — PROD (`/health`, `/health/db`, front) verificado respondiendo sobre ese commit exacto después de la aprobación.
