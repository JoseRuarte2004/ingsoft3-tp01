const { expect, test } = require("@playwright/test");

// La api tiene su propia dirección: NO es la del front. Sin barra al final.
const API = process.env.API_BASE_URL || "http://localhost:5050";
const USERNAME = process.env.QA_TEST_USERNAME;
const PASSWORD = process.env.QA_TEST_PASSWORD;

// Inicia sesión con el usuario fijo de QA y deja al `request` (cookies de
// sesión + csrf) listo para pedidos autenticados. Cada test recibe su propio
// `request` (Playwright lo aísla por test), así que esto corre una vez por test.
async function loguearse(request) {
	const csrfRes = await request.get(`${API}/csrf`);
	const { csrfToken } = await csrfRes.json();
	const loginRes = await request.post(`${API}/users/login`, {
		headers: { "CSRF-Token": csrfToken },
		data: { username: USERNAME, password: PASSWORD },
	});
	expect(loginRes.ok()).toBeTruthy();
	return csrfToken;
}

test("alta + verificación + borrado: el producto creado aparece y, al borrarlo, desaparece", async ({ request }) => {
	const csrfToken = await loguearse(request);
	const nombre = `integ ${Date.now()}`; // único: no choca con otra corrida

	const alta = await request.post(`${API}/products`, {
		headers: { "CSRF-Token": csrfToken },
		data: { name: nombre, quantity: 3, storageLocation: "Heladera", freezable: false },
	});
	expect(alta.status()).toBe(200);
	const creado = await alta.json();

	const listado = await request.get(`${API}/products`);
	const productos = await listado.json();
	expect(productos.some((p) => p.name === nombre)).toBe(true);

	const borrado = await request.delete(`${API}/products/${creado.id}`, {
		headers: { "CSRF-Token": csrfToken },
	});
	expect(borrado.status()).toBe(200);

	const listadoFinal = await request.get(`${API}/products`);
	const productosFinal = await listadoFinal.json();
	expect(productosFinal.some((p) => p.name === nombre)).toBe(false);
});

test("alta inválida: nombre vacío contesta 400 y no crea nada", async ({ request }) => {
	const csrfToken = await loguearse(request);

	const antes = await (await request.get(`${API}/products`)).json();

	const alta = await request.post(`${API}/products`, {
		headers: { "CSRF-Token": csrfToken },
		data: { name: "", quantity: 1, storageLocation: "Heladera", freezable: false },
	});
	expect(alta.status()).toBe(400);

	const despues = await (await request.get(`${API}/products`)).json();
	expect(despues.length).toBe(antes.length); // nada nuevo
});

test("sin sesión: GET /products contesta 403", async ({ request }) => {
	// Este test NO llama a loguearse(): el `request` de Playwright es un
	// contexto nuevo por test, así que acá no hay ninguna cookie de sesión.
	const res = await request.get(`${API}/products`);
	expect(res.status()).toBe(403);
});
