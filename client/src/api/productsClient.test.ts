import { crearProducto, ProductoAEnviar } from "./productsClient";

const producto: ProductoAEnviar = {
	name: "Leche",
	quantity: 2,
	expiryDate: null,
	storageLocation: "Heladera",
	freezable: false
};

function respuestaFalsa(status: number, body: unknown): Response {
	return {
		status,
		ok: status >= 200 && status < 300,
		json: () => Promise.resolve(body)
	} as Response;
}

describe("crearProducto (con un fetch inyectado, sin salir a la red)", () => {
	// Test con mock: se verifica la INTERACCIÓN — método, headers y body —,
	// no solo lo que devuelve.
	test("llama a POST /products con el CSRF token y el body correctos", async () => {
		const fetchFalso = jest.fn().mockResolvedValue(respuestaFalsa(200, { id: 1, ...producto }));

		await crearProducto(producto, "token-123", fetchFalso);

		expect(fetchFalso).toHaveBeenCalledTimes(1);
		const [url, opciones] = fetchFalso.mock.calls[0];
		expect(url).toBe("/products");
		expect(opciones.method).toBe("POST");
		expect(opciones.headers["CSRF-Token"]).toBe("token-123");
		expect(JSON.parse(opciones.body)).toEqual(producto);
	});

	test("devuelve sesionExpirada cuando la API responde 403", async () => {
		const fetchFalso = jest.fn().mockResolvedValue(respuestaFalsa(403, {}));

		const resultado = await crearProducto(producto, "token-123", fetchFalso);

		expect(resultado.ok).toBe(false);
		expect((resultado as { sesionExpirada: boolean }).sesionExpirada).toBe(true);
	});
});
