/**
 * Agrupa los distintos textos libres de "storageLocation" en una categoría
 * fija, para poder filtrar el inventario por tipo de almacenamiento.
 * (Código nuevo, real, y -a propósito- sin un solo test: es la demo del
 * segundo PR del TP5, que queda abierta y en rojo hasta la defensa.)
 */
function normalizarStorageLocation(texto) {
	if (!texto || typeof texto !== "string") {
		return "otro";
	}

	const valor = texto.trim().toLowerCase();

	if (valor.includes("heladera") || valor.includes("refriger")) {
		return "refrigerado";
	}
	if (valor.includes("freezer") || valor.includes("congel")) {
		return "congelado";
	}
	if (valor.includes("alacena") || valor.includes("despensa") || valor.includes("estante")) {
		return "ambiente";
	}

	return "otro";
}

module.exports = normalizarStorageLocation;
