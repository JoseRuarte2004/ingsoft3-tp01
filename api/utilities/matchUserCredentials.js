var db = require("../database");

/**
 * Search for a user that has both a matching ID and UUID.
 * Can be used to protect particularly sensitive info e.g. exposing valuable inventory levels/account details.
 * Adds additional processing overhead as a caveat.
 * @param {number} userId The ID of the user, primary key in users table.
 * @param {string} userUuid The UUID generated for a user.
 * @returns {boolean} True if both ID and UUID match a user entry, false otherwise.
 */
async function matchUserCredentials(userId, userUuid){
	await db.user.findOne({
		where: {
			"id": userId,
			"uuid": userUuid
		}
	}).then(function(user){
		return user ? true : false;
	});
}

module.exports = matchUserCredentials;