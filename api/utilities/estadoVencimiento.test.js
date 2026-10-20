const { calcularEstadoVencimiento, prioridadDeAlerta } = require("./estadoVencimiento");

describe("calcularEstadoVencimiento", () => {
	const hoy = new Date("2026-10-20T12:00:00Z");

	test("devuelve sin-fecha si el producto no tiene expiryDate", () => {
		expect(calcularEstadoVencimiento({}, hoy)).toBe("sin-fecha");
	});

	test("devuelve sin-fecha si no se pasa ningún producto", () => {
		expect(calcularEstadoVencimiento(null, hoy)).toBe("sin-fecha");
	});

	test("devuelve vencido si la fecha ya pasó", () => {
		expect(calcularEstadoVencimiento({ expiryDate: "2026-10-15T12:00:00Z" }, hoy)).toBe("vencido");
	});

	test("devuelve por-vencer dentro de los primeros 3 días", () => {
		expect(calcularEstadoVencimiento({ expiryDate: "2026-10-22T12:00:00Z" }, hoy)).toBe("por-vencer");
	});

	test("devuelve esta-semana entre el día 4 y el día 7", () => {
		expect(calcularEstadoVencimiento({ expiryDate: "2026-10-26T12:00:00Z" }, hoy)).toBe("esta-semana");
	});

	test("devuelve fresco pasados los 7 días", () => {
		expect(calcularEstadoVencimiento({ expiryDate: "2026-11-10T12:00:00Z" }, hoy)).toBe("fresco");
	});
});

describe("prioridadDeAlerta", () => {
	test.each([
		["vencido", 0],
		["por-vencer", 1],
		["esta-semana", 2],
		["fresco", 3],
		["sin-fecha", 4],
	])("mapea %s a prioridad %i", (estado, prioridadEsperada) => {
		expect(prioridadDeAlerta(estado)).toBe(prioridadEsperada);
	});
});
