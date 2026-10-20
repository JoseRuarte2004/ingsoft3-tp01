import { fetchCsrf } from "./fetchcsrf";

describe("fetchCsrf", () => {
	test("pide GET /csrf/ y devuelve el token recibido", async () => {
		const fetchFalso = jest.fn().mockResolvedValue({
			json: () => Promise.resolve({ csrfToken: "token-de-prueba" })
		});

		const resultado = await fetchCsrf(fetchFalso as unknown as typeof fetch);

		expect(resultado.csrfToken).toBe("token-de-prueba");
		expect(fetchFalso).toHaveBeenCalledWith("/csrf/", expect.objectContaining({ method: "get" }));
	});
});
