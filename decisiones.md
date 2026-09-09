# Decisiones — TP1

## 1. Por qué Git no pudo resolver el conflicto solo

Git resuelve automáticamente los merges cuando los cambios tocan partes distintas del archivo, comparando ambas ramas contra su ancestro común. En este caso, las ramas `feature/titulo-a` y `feature/titulo-b` partieron del mismo commit de `main` y ambas modificaron **la misma línea** del `README.md` (el título), pero con contenido distinto. Git no tiene forma de decidir cuál de las dos versiones es "la correcta" — no es un problema técnico, es una decisión de contenido que solo puede tomar una persona.

Para que este conflicto nunca hubiera aparecido, alguna de las dos ramas debería haberse creado *después* de que la otra ya estuviera mergeada en `main` (así partiría de una base actualizada y no tocaría una línea "vieja"), o directamente ninguna de las dos debería haber tocado esa línea.

## 2. Qué problemas encontré y cómo los solucioné

Durante la prueba de fuego del paso 4.4 (verificar que el push directo a `main` fuera rechazado), hice un commit local de prueba (`test: intento de push directo`) que la guía indica borrar después con `git reset --hard HEAD~1`. Me lo salteé, y seguí trabajando: cuando más adelante hice `git pull` después de mergear el primer PR desde la web, Git me avisó que las ramas habían divergido (mi commit de prueba local vs. el commit del PR ya mergeado en el remoto), porque local y remoto tenían historiales distintos a partir de ese punto.

Lo solucioné con `git reset --hard origin/main`, que descarta cualquier commit local no subido y deja mi rama `main` idéntica a la del remoto. Fue un buen recordatorio de por qué la guía insiste en limpiar los commits de prueba apenas cumplen su función: dejarlos vivos genera divergencias artificiales que después hay que resolver a mano.

## 3. Declaración de uso de IA

Usé Claude (Anthropic) como asistente durante todo el TP: para entender la guía de la cátedra, para que me explicara paso a paso cada sección antes de ejecutarla, y para diagnosticar y resolver el problema de divergencia de ramas del punto 2. No generó ningún commit ni tocó el repositorio directamente — cada acción (crear el repo, proteger `main`, crear las ramas, resolver el conflicto, taguear la release) la ejecuté yo mismo desde la web de GitHub o mi terminal, verificando en cada paso que el resultado fuera el esperado antes de seguir. También me ayudó a redactar este archivo y `evidencias.md` a partir de lo que realmente pasó durante la sesión.