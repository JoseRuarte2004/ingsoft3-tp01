const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");

// Use more salt rounds in production for greater security.
const saltRounds = 10;

/**
 * Registra un usuario nuevo, rechazando username/email duplicados.
 * Recibe `db` por parámetro (no lo importa adentro) para poder mockearlo.
 */
async function registrarUsuario(datos, db) {
	const existente = await db.user.findOne({
		where: db.sequelize.or(
			{ username: datos.username },
			{ email: datos.email }
		)
	});

	if (existente) {
		if (existente.username === datos.username) {
			return { ok: false, mensaje: "An account with that username already exists." };
		}
		return { ok: false, mensaje: "An account with that email already exists." };
	}

	const hash = await bcrypt.hash(datos.password, saltRounds);
	const user = await db.user.create({
		username: datos.username,
		email: datos.email,
		password: hash,
		uuid: uuidv4()
	});

	return { ok: true, mensaje: "User creation successful.", user };
}

module.exports = { registrarUsuario };
