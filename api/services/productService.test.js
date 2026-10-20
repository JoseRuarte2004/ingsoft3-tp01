const { crearProducto } = require("./productService");

const productoValido = {
	name: "Leche",
	quantity: 2,
	expiryDate: "2026-12-01",
	storageLocation: "Heladera",
	freezable: false
};

describe("crearProducto (con un db falso, sin tocar Postgres)", () => {
	// Test con mock: lo que se verifica es la INTERACCIÓN (que create NO se llamó),
	// no un valor de retorno — por eso es un mock y no un stub.
	test("no llama a db.product.create si el producto es inválido", async () => {
		const dbFalso = { product: { create: jest.fn() } };

		const resultado = await crearProducto({ ...productoValido, name: "" }, 1, dbFalso);

		expect(resultado.ok).toBe(false);
		expect(resultado.status).toBe(400);
		expect(dbFalso.product.create).not.toHaveBeenCalled();
	});

	// Segundo test con mock: ahora se verifica que SÍ se llamó, una sola vez,
	// con el userId correcto.
	test("llama a db.product.create una vez con el userId correcto si el producto es válido", async () => {
		const productoCreado = { id: 1, ...productoValido, userId: 7 };
		const dbFalso = { product: { create: jest.fn().mockResolvedValue(productoCreado) } };

		const resultado = await crearProducto(productoValido, 7, dbFalso);

		expect(resultado.ok).toBe(true);
		expect(resultado.product).toEqual(productoCreado);
		expect(dbFalso.product.create).toHaveBeenCalledTimes(1);
		expect(dbFalso.product.create).toHaveBeenCalledWith(
			expect.objectContaining({ name: "Leche", userId: 7 })
		);
	});
});
