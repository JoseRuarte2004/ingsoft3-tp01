const validarProducto = require("../utilities/validarProducto");

/**
 * Crea un producto para un usuario, validando antes de tocar la base.
 * Recibe `db` por parámetro (no lo importa adentro) para que un test pueda
 * pasarle un doble y verificar la interacción sin tocar Postgres.
 */
async function crearProducto(datos, userId, db) {
	const validacion = validarProducto(datos);
	if (!validacion.esValido) {
		return { ok: false, status: 400, error: validacion.error };
	}

	const product = await db.product.create({
		name: datos.name,
		quantity: datos.quantity,
		expiryDate: datos.expiryDate,
		storageLocation: datos.storageLocation,
		freezable: datos.freezable,
		userId
	});

	return { ok: true, status: 200, product };
}

module.exports = { crearProducto };
