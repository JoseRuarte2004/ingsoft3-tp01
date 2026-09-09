const db = require("./database");

let productId;

beforeAll(async () => {
	await db.sequelize.sync();
});

test("create product", async () => {
	expect.assertions(1);
	const product = await db.product.create({
		name:"milk",
		quantity:1,
		expiryDate:"2020-10-28",
		storageLocation:"fridge",
		freezable:false
	});
	productId = product.id;
	expect(product.name).toEqual("milk");
});

test("get product", async () => {
	expect.assertions(5);
	const product = await db.product.findByPk(productId);
	expect(product.name).toEqual("milk");
	expect(product.quantity).toEqual(1);
	expect(product.expiryDate).toEqual("2020-10-28");
	expect(product.storageLocation).toEqual("fridge");
	expect(product.freezable).toEqual(false);
});

test("delete product", async () => {
	expect.assertions(1);
	await db.product.destroy({
		where: {
			id: productId
		}
	});
	const product = await db.product.findByPk(productId);
	expect(product).toBeNull();
});

afterAll(async () => {
	await db.sequelize.close();
});
