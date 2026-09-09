var express = require("express");
var router = express.Router();
var db = require("../database");
var matchUserCredentials = require("../utilities/matchUserCredentials");

/**
 * Get all products owned by the user.
 */
router.get("/", function(request, response) {
	if (request.isAuthenticated() && (async () => await matchUserCredentials(request.user.id, request.user.uuid))){
		db.product.findAll({
			where: {
				"user.id": request.user.id
			}
		})
			.then(products => {
				response.status(200).send(JSON.stringify(products));
			})
			.catch(error => {
				response.status(500).send(JSON.stringify(error));
			});
	} else {
		response.status(403).send("Not authenticated, access is blocked.");
	}
});

/**
 * Get a product that has a specific id.
 */
router.get("/:id", function(request, response) {
	if (request.isAuthenticated()){
		db.product.findByPk(request.params.id)
			.then(product => {
				response.status(200).send(JSON.stringify(product));
			})
			.catch(error => {
				response.status(500).send(JSON.stringify(error));
			});
	} else {
		response.status(403).send("Not authenticated, access is blocked.");
	}
});

/**
 * Create a product with the parameters passed.
 */
router.post("/", function(request, response) {
	if (request.isAuthenticated()) {
		db.product.create({
			name: request.body.name,
			quantity: request.body.quantity,
			expiryDate: request.body.expiryDate,
			storageLocation: request.body.storageLocation,
			freezable: request.body.freezable,
			id: request.body.id
		})
			.then(product => {
				response.status(200).send(JSON.stringify(product));
			})
			.catch(error => {
				response.status(500).send(JSON.stringify(error));
			});
	} else {
		response.status(403).send("Not authenticated, access is blocked.");
	}
});

/**
 * Delete a product, based on product ID.
 */
router.delete("/:id", function(request, response) {
	if (request.isAuthenticated()){
		db.product.destroy({
			where: {
				id: request.params.id
			}
		})
			.then(() => {
				response.status(200).send();
			})
			.catch(error => {
				response.status(500).send(JSON.stringify(error));
			});
	} else {
		response.status(403).send("Not authenticated, access is blocked.");
	}
});

module.exports = router;