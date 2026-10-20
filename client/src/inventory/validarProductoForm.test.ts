import { validarProductoForm, ProductoForm } from "./validarProductoForm";

const formValido: ProductoForm = {
	name: "Leche",
	quantity: 2,
	storageLocation: "Heladera"
};

describe("validarProductoForm", () => {
	// Parametrizado + caso de error: un nombre sin contenido se rechaza, y el
	// mensaje dice por qué.
	test.each([
		["vacío", ""],
		["solo espacios", "   "],
	])("rechaza un nombre %s", (_caso, name) => {
		const resultado = validarProductoForm({ ...formValido, name });

		expect(resultado.esValido).toBe(false);
		expect(resultado.error).toMatch(/nombre/i);
	});

	test("rechaza una cantidad negativa", () => {
		const resultado = validarProductoForm({ ...formValido, quantity: -5 });

		expect(resultado.esValido).toBe(false);
		expect(resultado.error).toMatch(/cantidad/i);
	});

	test("acepta un producto con todos los campos válidos", () => {
		const resultado = validarProductoForm(formValido);

		expect(resultado.esValido).toBe(true);
		expect(resultado.error).toBeNull();
	});
});
