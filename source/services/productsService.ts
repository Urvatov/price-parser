import { eq } from "drizzle-orm";
import db from "../database/client.js";
import { productsTable } from "../database/schema.js";
import type { NewProduct, Product } from "../database/types.js";

type Marketplace = "OZON" | "WILDBERRIES" | "YANDEX" | "AVITO";

export async function getProducts(marketplaceName: Marketplace | null): Promise<Product[]> {
	let products;
	if (marketplaceName) {
		products = await db.select().from(productsTable).where(eq(productsTable.marketplace, marketplaceName));
	} else {
		products = await db.select().from(productsTable);
	}

	return products;
}

export async function getSpecificProduct(productId: Product["id"]): Promise<Product> {
	const [product] = await db.select().from(productsTable).where(eq(productsTable.id, productId));

	return product;
}

export async function addProduct(newProduct: NewProduct): Promise<Product> {
	const [addedProduct] = await db.insert(productsTable).values(newProduct).returning();

	return addedProduct;
}

export async function deleteProduct(productId: Product["id"]): Promise<Product> {
	const [deletedProduct] = await db.delete(productsTable).where(eq(productsTable.id, productId)).returning();

	return deletedProduct;
}
