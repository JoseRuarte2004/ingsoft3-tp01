# Decisiones — App del semestre (TP2)

## Qué app elegí y por qué

Elegí **YourInventoryManager**, una app de gestión de inventario doméstico (qué tenés guardado, en qué lugar de la casa y cuándo vence), tomada de un proyecto open-source de GitHub y adaptada por mí. Cumple los requisitos mínimos: backend con API propia (Node.js + Express, `api/`), frontend SPA (React + TypeScript, `client/`) e interacción con base de datos relacional (PostgreSQL vía Sequelize).

## Criterios de elección

- **¿Buildea y corre localmente hoy, sin magia?** La probé ANTES de comprometerme, y no arrancaba tal cual: tenía varios bugs reales que tuve que arreglar para que funcionara de punta a punta (detallados abajo). Una vez arreglados, corre local sin necesidad de instalar Postgres en la máquina (el motor es un contenedor vía `docker-compose.yml`, según lo pedido en el checkpoint).
- **¿Tiene o puedo escribirle tests?** Ya traía un archivo de tests (`api/database.test.js`) que directamente no corría (usaba `db.Product` en mayúscula, cuando el módulo exporta `product` en minúscula). Lo arreglé y hoy los 3 tests pasan (`npm test` en `api/`). Buena base para TP5.
- **¿Entendés el código lo suficiente como para modificarlo?** Sí — encontré y corregí varios bugs no triviales (ver abajo), y agregé funcionalidad nueva (Update de productos, logout, validaciones), lo que en los hechos ya demuestra poder modificar la app en vivo.
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

---

# Decisiones — TP1

## 1. Por qué Git no pudo resolver el conflicto solo

Git resuelve automáticamente los merges cuando los cambios tocan partes distintas del archivo, comparando ambas ramas contra su ancestro común. En este caso, las ramas `feature/titulo-a` y `feature/titulo-b` partieron del mismo commit de `main` y ambas modificaron **la misma línea** del `README.md` (el título), pero con contenido distinto. Git no tiene forma de decidir cuál de las dos versiones es "la correcta" — no es un problema técnico, es una decisión de contenido que solo puede tomar una persona.

Para que este conflicto nunca hubiera aparecido, alguna de las dos ramas debería haberse creado *después* de que la otra ya estuviera mergeada en `main` (así partiría de una base actualizada y no tocaría una línea "vieja"), o directamente ninguna de las dos debería haber tocado esa línea.

## 2. Qué problemas encontré y cómo los solucioné

Durante la prueba de fuego del paso 4.4 (verificar que el push directo a `main` fuera rechazado), hice un commit local de prueba (`test: intento de push directo`) que la guía indica borrar después con `git reset --hard HEAD~1`. Me lo salteé, y seguí trabajando: cuando más adelante hice `git pull` después de mergear el primer PR desde la web, Git me avisó que las ramas habían divergido (mi commit de prueba local vs. el commit del PR ya mergeado en el remoto), porque local y remoto tenían historiales distintos a partir de ese punto.

Lo solucioné con `git reset --hard origin/main`, que descarta cualquier commit local no subido y deja mi rama `main` idéntica a la del remoto. Fue un buen recordatorio de por qué la guía insiste en limpiar los commits de prueba apenas cumplen su función: dejarlos vivos genera divergencias artificiales que después hay que resolver a mano.

## 3. Declaración de uso de IA

Usé Claude (Anthropic) como asistente durante todo el TP: para entender la guía de la cátedra, para que me explicara paso a paso cada sección antes de ejecutarla, y para diagnosticar y resolver el problema de divergencia de ramas del punto 2. No generó ningún commit ni tocó el repositorio directamente — cada acción (crear el repo, proteger `main`, crear las ramas, resolver el conflicto, taguear la release) la ejecuté yo mismo desde la web de GitHub o mi terminal, verificando en cada paso que el resultado fuera el esperado antes de seguir. También me ayudó a redactar este archivo y `evidencias.md` a partir de lo que realmente pasó durante la sesión.