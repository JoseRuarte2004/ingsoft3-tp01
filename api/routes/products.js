var express = require("express");
var router = express.Router();
var db = require("../database");
var matchUserCredentials = require("../utilities/matchUserCredentials");

/**
 * Get all products owned by the user.
 */
router.get("/", async function(request, response) {
	if (request.isAuthenticated() && await matchUserCredentials(request.user.id, request.user.uuid)){
		db.product.findAll({
			where: {
				userId: request.user.id
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
 * Get a product that has a specific id, owned by the requesting user.
 */
router.get("/:id", async function(request, response) {
	if (request.isAuthenticated() && await matchUserCredentials(request.user.id, request.user.uuid)){
		db.product.findOne({
			where: {
				id: request.params.id,
				userId: request.user.id
			}
		})
			.then(product => {
				if (!product) {
					response.status(404).send("Product not found.");
					return;
				}
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
 * Create a product with the parameters passed, owned by the requesting user.
 */
router.post("/", function(request, response) {
	if (request.isAuthenticated()) {
		db.product.create({
			name: request.body.name,
			quantity: request.body.quantity,
			expiryDate: request.body.expiryDate,
			storageLocation: request.body.storageLocation,
			freezable: request.body.freezable,
			userId: request.user.id
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
 * Update a product owned by the requesting user, based on product ID.
 */
router.put("/:id", async function(request, response) {
	if (request.isAuthenticated() && await matchUserCredentials(request.user.id, request.user.uuid)){
		db.product.update({
			name: request.body.name,
			quantity: request.body.quantity,
			expiryDate: request.body.expiryDate,
			storageLocation: request.body.storageLocation,
			freezable: request.body.freezable
		}, {
			where: {
				id: request.params.id,
				userId: request.user.id
			}
		})
			.then(([updatedCount]) => {
				if (!updatedCount) {
					response.status(404).send("Product not found.");
					return;
				}
				response.status(200).send();
			})
			.catch(error => {
				response.status(500).send(JSON.stringify(error));
			});
	} else {
		response.status(403).send("Not authenticated, access is blocked.");
	}
});

/**
 * Delete a product owned by the requesting user, based on product ID.
 */
router.delete("/:id", async function(request, response) {
	if (request.isAuthenticated() && await matchUserCredentials(request.user.id, request.user.uuid)){
		db.product.destroy({
			where: {
				id: request.params.id,
				userId: request.user.id
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
