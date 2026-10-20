export interface ProductoForm {
	name: string;
	quantity: number;
	storageLocation: string;
}

export interface ResultadoValidacion {
	esValido: boolean;
	error: string | null;
}

/**
 * Validación del lado del cliente, espejo de api/utilities/validarProducto.js.
 * Función pura: no toca el DOM ni la red, solo evalúa el objeto que recibe.
 */
export function validarProductoForm(form: ProductoForm): ResultadoValidacion {
	if (!form.name || form.name.trim().length === 0) {
		return { esValido: false, error: "El nombre del producto es obligatorio." };
	}

	if (typeof form.quantity !== "number" || form.quantity < 0) {
		return { esValido: false, error: "La cantidad tiene que ser un número mayor o igual a 0." };
	}

	if (!form.storageLocation || form.storageLocation.trim().length === 0) {
		return { esValido: false, error: "El lugar de almacenamiento es obligatorio." };
	}

	return { esValido: true, error: null };
}
