const csrf = require("csurf");
const express = require("express");
const router = express.Router();

const csrfProtection = csrf({ cookie: true });

router.get("/", csrfProtection, function (request, response) {
	if (!request.cookies["csrfToken"]){
		response.send({csrfToken: request.csrfToken() });
	}
	response.send("csrfToken already exists.");
});

module.exports = router;