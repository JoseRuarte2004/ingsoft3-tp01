// Acá el mock es del MÓDULO entero (jest.mock del "database"), la otra técnica
// además de la inyección por parámetro que se usa en productService.test.js:
// matchUserCredentials importa "../database" directo, así que se reemplaza el
// módulo completo en vez de pasarle un doble por argumento.
jest.mock("../database", () => ({
	user: { findOne: jest.fn() }
}));

const db = require("../database");
const matchUserCredentials = require("./matchUserCredentials");

describe("matchUserCredentials", () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	// Regla: solo coinciden un usuario si el ID y el UUID son del MISMO registro.
	test("devuelve true si existe un usuario con ese id y uuid", async () => {
		db.user.findOne.mockResolvedValue({ id: 1, uuid: "abc" });

		const resultado = await matchUserCredentials(1, "abc");

		expect(resultado).toBe(true);
		expect(db.user.findOne).toHaveBeenCalledWith({ where: { id: 1, uuid: "abc" } });
	});

	// Caso de error: id y uuid que no pertenecen al mismo usuario (o no existen).
	test("devuelve false si no hay ningún usuario con ese id y uuid", async () => {
		db.user.findOne.mockResolvedValue(null);

		const resultado = await matchUserCredentials(1, "uuid-que-no-es-de-ese-id");

		expect(resultado).toBe(false);
	});
});
