const express = require("express");
const router = express.Router();

// app.js ya aplica csurf globalmente (app.use(csrf(...)), antes de montar
// esta ruta) — volver a aplicarlo acá generaba una SEGUNDA cookie `_csrf`
// (secreto distinto) en la misma respuesta, y el navegador terminaba
// guardando una que no coincidía con el token que esta ruta devolvía.
// request.csrfToken() ya existe gracias al middleware global.
router.get("/", function (request, response) {
	response.send({csrfToken: request.csrfToken() });
});

module.exports = router;