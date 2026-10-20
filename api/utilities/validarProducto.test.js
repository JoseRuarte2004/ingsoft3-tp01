const validarProducto = require("./validarProducto");

const productoValido = {
	name: "Leche",
	quantity: 2,
	expiryDate: "2026-12-01",
	storageLocation: "Heladera",
	freezable: false
};

describe("validarProducto", () => {
	// Regla 1: el nombre es obligatorio. Parametrizado (test.each) y, a la vez,
	// el caso de error: el mensaje tiene que decir cuál es el problema.
	test.each([
		["vacío", ""],
		["solo espacios", "   "],
		["un tabulador", "\t"],
	])("rechaza un nombre %s", (_caso, name) => {
		const resultado = validarProducto({ ...productoValido, name });

		expect(resultado.esValido).toBe(false);
		expect(resultado.error).toMatch(/nombre/i);
	});

	// Regla 2: la cantidad no puede ser negativa.
	test("rechaza una cantidad negativa", () => {
		const resultado = validarProducto({ ...productoValido, quantity: -1 });

		expect(resultado.esValido).toBe(false);
		expect(resultado.error).toMatch(/cantidad/i);
	});

	// Regla 3: el lugar de almacenamiento es obligatorio.
	test("rechaza un storageLocation vacío", () => {
		const resultado = validarProducto({ ...productoValido, storageLocation: "" });

		expect(resultado.esValido).toBe(false);
		expect(resultado.error).toMatch(/almacenamiento/i);
	});

	// Regla 4: freezable tiene que ser un booleano real, no un string ni undefined.
	test("rechaza freezable que no es booleano", () => {
		const resultado = validarProducto({ ...productoValido, freezable: "no" });

		expect(resultado.esValido).toBe(false);
		expect(resultado.error).toMatch(/freezable/i);
	});

	// Ejercicio del "camino sin cubrir" (decisiones.md): la rama que ningún otro
	// test recorre es "producto === null/undefined" (línea 6, el `|| {}`).
	test("rechaza cuando no se pasa ningún producto", () => {
		const resultado = validarProducto(null);

		expect(resultado.esValido).toBe(false);
		expect(resultado.error).toMatch(/nombre/i);
	});

	test("acepta un producto con todos los campos válidos", () => {
		const resultado = validarProducto(productoValido);

		expect(resultado.esValido).toBe(true);
		expect(resultado.error).toBeNull();
	});
});
