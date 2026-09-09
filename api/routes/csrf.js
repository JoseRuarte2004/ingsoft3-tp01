const csrf = require("csurf");
const express = require("express");
const router = express.Router();

const csrfProtection = csrf({ cookie: true });

router.get("/", csrfProtection, function (request, response) {
	response.send({csrfToken: request.csrfToken() });
});

module.exports = router;