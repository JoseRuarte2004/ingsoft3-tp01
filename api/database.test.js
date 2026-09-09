const db = require("./database");
beforeAll(async () => {
	await db.sequelize.sync();
});

test("create product", async () => {
	expect.assertions(1);
	const product = await db.Product.create({
		id: 1,
		name:"milk",
		quantity:1,
		expiryDate:"2020-10-28",
		storageLocation:"fridge",
		freezable:false
	});
	expect(product.id).toEqual(1);
});

test("get product", async () => {
	expect.assertions(5);
	const product = await db.Product.findByPk(1);
	expect(product.name).toEqual("milk");
	expect(product.quantity).toEqual(1);
	expect(product.expiryDate).toEqual("2020-10-28");
	expect(product.storageLocation).toEqual("fridge");
	expect(product.freezable).toEqual(false);
});

test("delete product", async () => {
	expect.assertions(1);
	await db.Product.destroy({
		where: {
			id: 1
		}
	});
	const product = await db.Product.findByPk(1);
	expect(product).toBeNull();
});

afterAll(async () => {
	await db.sequelize.close();
});