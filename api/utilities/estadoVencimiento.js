/**
 * Clasifica un producto según cuánto falta para que venza.
 * (Tiene varios caminos adentro y -a propósito- ni un solo test.)
 */
function calcularEstadoVencimiento(producto, hoy = new Date()) {
	if (!producto || !producto.expiryDate) {
		return "sin-fecha";
	}

	const vencimiento = new Date(producto.expiryDate);
	const diffDias = (vencimiento - hoy) / (1000 * 60 * 60 * 24);

	if (diffDias < 0) {
		return "vencido";
	}
	if (diffDias <= 3) {
		return "por-vencer";
	}
	if (diffDias <= 7) {
		return "esta-semana";
	}
	return "fresco";
}

/**
 * Prioridad numérica de un estado, para poder ordenar el inventario mostrando
 * primero lo más urgente. (Tampoco tiene tests.)
 */
function prioridadDeAlerta(estado) {
	switch (estado) {
		case "vencido":
			return 0;
		case "por-vencer":
			return 1;
		case "esta-semana":
			return 2;
		case "fresco":
			return 3;
		default:
			return 4;
	}
}

module.exports = { calcularEstadoVencimiento, prioridadDeAlerta };
