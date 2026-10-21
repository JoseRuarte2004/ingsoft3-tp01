const { expect, test } = require("@playwright/test");

const USERNAME = process.env.QA_TEST_USERNAME;
const PASSWORD = process.env.QA_TEST_PASSWORD;

// El form arranca en modo "Register": hay que pasarlo a "Login" antes de
// loguearse con el usuario fijo de QA.
async function loguearse(page) {
	await page.goto("/");
	await page.getByText("¿Ya tenés cuenta? Iniciá sesión acá.").click();
	await page.getByLabel("Username").fill(USERNAME);
	await page.getByLabel("Password").fill(PASSWORD);
	await page.getByRole("button", { name: "Login" }).click();
	await expect(page).toHaveURL(/\/Inventory/);
}

test("crear un producto lo muestra en la lista, y borrarlo lo saca", async ({ page }) => {
	await loguearse(page);

	const nombre = `e2e ${Date.now()}`; // único: no choca con otra corrida
	await page.getByLabel("Name").fill(nombre);
	await page.getByLabel("Quantity").fill("2");
	await page.getByLabel("Storage Location").fill("Heladera");
	await page.getByRole("button", { name: "Agregar" }).click();

	await expect(page.getByText(nombre)).toBeVisible();

	// Scopeado a LA FILA de este producto: "Eliminar" se repite en cada fila
	// de la tabla, así que hace falta acotar por la fila que tiene este nombre.
	const fila = page.getByRole("row", { name: nombre });
	await fila.getByRole("button", { name: "Eliminar" }).click();

	await expect(page.getByText(nombre)).toHaveCount(0);
});

test("una cantidad negativa muestra el error y no crea nada", async ({ page }) => {
	await loguearse(page);

	const nombre = `e2e ${Date.now()} invalido`;
	await page.getByLabel("Name").fill(nombre);
	await page.getByLabel("Quantity").fill("-1");
	await page.getByLabel("Storage Location").fill("Heladera");
	await page.getByRole("button", { name: "Agregar" }).click();

	await expect(page.getByRole("alert")).toBeVisible();
	await expect(page.getByText(nombre)).toHaveCount(0);
});

test("el login lleva al inventario del usuario", async ({ page }) => {
	// El flujo que importa más: si esto no anda, nadie entra a la app.
	await loguearse(page);

	await expect(page.getByRole("heading", { name: "Mi Inventario" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Cerrar sesión" })).toBeVisible();
});
