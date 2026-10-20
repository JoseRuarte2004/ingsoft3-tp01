/**
 * Valida los datos de un producto antes de crearlo o actualizarlo.
 * Función pura: no toca la base ni nada externo, solo evalúa el objeto que recibe.
 */
function validarProducto(producto) {
	const datos = producto || {};

	if (typeof datos.name !== "string" || datos.name.trim().length === 0) {
		return { esValido: false, error: "El nombre del producto es obligatorio." };
	}

	if (typeof datos.quantity !== "number" || datos.quantity < 0) {
		return { esValido: false, error: "La cantidad tiene que ser un número mayor o igual a 0." };
	}

	if (typeof datos.storageLocation !== "string" || datos.storageLocation.trim().length === 0) {
		return { esValido: false, error: "El lugar de almacenamiento es obligatorio." };
	}

	if (typeof datos.freezable !== "boolean") {
		return { esValido: false, error: "\"freezable\" tiene que ser true o false." };
	}

	return { esValido: true, error: null };
}

module.exports = validarProducto;
