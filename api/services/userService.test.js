const { registrarUsuario } = require("./userService");

const datosValidos = {
	username: "jose",
	email: "jose@example.com",
	password: "Password123!"
};

function dbFalsoSinUsuarios() {
	return {
		user: {
			findOne: jest.fn().mockResolvedValue(null),
			create: jest.fn().mockResolvedValue({ id: 1, ...datosValidos }),
		},
		sequelize: { or: (...condiciones) => ({ [Symbol.for("or")]: condiciones }) }
	};
}

describe("registrarUsuario", () => {
	test("crea el usuario si no existe username ni email", async () => {
		const dbFalso = dbFalsoSinUsuarios();

		const resultado = await registrarUsuario(datosValidos, dbFalso);

		expect(resultado.ok).toBe(true);
		expect(resultado.mensaje).toBe("User creation successful.");
		expect(dbFalso.user.create).toHaveBeenCalledTimes(1);
		expect(dbFalso.user.create).toHaveBeenCalledWith(
			expect.objectContaining({ username: "jose", email: "jose@example.com" })
		);
	});

	test("rechaza el registro si el username ya existe, y no llama a create", async () => {
		const dbFalso = dbFalsoSinUsuarios();
		dbFalso.user.findOne.mockResolvedValue({ username: "jose", email: "otro@example.com" });

		const resultado = await registrarUsuario(datosValidos, dbFalso);

		expect(resultado.ok).toBe(false);
		expect(resultado.mensaje).toMatch(/username/i);
		expect(dbFalso.user.create).not.toHaveBeenCalled();
	});

	test("rechaza el registro si el email ya existe (con otro username)", async () => {
		const dbFalso = dbFalsoSinUsuarios();
		dbFalso.user.findOne.mockResolvedValue({ username: "otro-user", email: "jose@example.com" });

		const resultado = await registrarUsuario(datosValidos, dbFalso);

		expect(resultado.ok).toBe(false);
		expect(resultado.mensaje).toMatch(/email/i);
	});
});
