var express = require("express");
var router = express.Router();
var db = require("../database");

/**
 * Liveness: el proceso está arriba y responde. No toca la base, así que
 * no puede dar falso rojo por un cold start de la BD mientras el proceso
 * ya está vivo.
 */
router.get("/", function (request, response) {
	response.status(200).send({ status: "ok" });
});

/**
 * Readiness: la base responde. Un "/health" en verde no dice nada sobre la
 * BD (TP6 §2.3) — este endpoint es el que lo prueba.
 */
router.get("/db", async function (request, response) {
	try {
		await db.sequelize.query("SELECT 1");
		response.status(200).send({ status: "ok" });
	} catch (error) {
		response.status(500).send({ status: "error" });
	}
});

module.exports = router;
