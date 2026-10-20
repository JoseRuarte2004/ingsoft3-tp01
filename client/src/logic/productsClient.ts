export interface ProductoAEnviar {
	name: string;
	quantity: number;
	expiryDate: string | null;
	storageLocation: string;
	freezable: boolean;
}

export type ResultadoCrearProducto =
	| { ok: true; status: number; product: unknown }
	| { ok: false; status: number; sesionExpirada: boolean };

type FetchFn = typeof fetch;

/**
 * Llama a POST /products. Recibe `fetchFn` por parámetro (default: el fetch
 * global del navegador) para que un test pueda pasarle un doble y verificar
 * la interacción sin salir a la red.
 */
export async function crearProducto(
	producto: ProductoAEnviar,
	csrfToken: string,
	fetchFn: FetchFn = fetch
): Promise<ResultadoCrearProducto> {
	const response = await fetchFn("/products", {
		method: "POST",
		headers: { "Content-Type": "application/json", "CSRF-Token": csrfToken },
		credentials: "include",
		body: JSON.stringify(producto)
	});

	if (response.status === 403) {
		return { ok: false, status: 403, sesionExpirada: true };
	}

	if (!response.ok) {
		return { ok: false, status: response.status, sesionExpirada: false };
	}

	const product = await response.json();
	return { ok: true, status: response.status, product };
}
