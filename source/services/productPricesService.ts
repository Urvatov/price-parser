import { desc, eq } from "drizzle-orm";
import db from "../database/client.js";
import { productPricesTable } from "../database/schema.js";
import { NewProductPrice, ProductPrice } from "../database/types.js";

export async function addProductPrice(newProductPrice: NewProductPrice): Promise<ProductPrice> {
	const [addedProductPrice] = await db.insert(productPricesTable).values(newProductPrice).returning();
	return addedProductPrice;
}

export async function getProductPricesHistory(productId: string): Promise<ProductPrice[]> {
	const prices = await db
		.select()
		.from(productPricesTable)
		.where(eq(productPricesTable.productId, productId))
		.orderBy(desc(productPricesTable.createdAt));
	return prices;
}

export async function getLatestProductPrice(productId: string): Promise<ProductPrice | null> {
	const [latestPrice] = await db
		.select()
		.from(productPricesTable)
		.where(eq(productPricesTable.productId, productId))
		.orderBy(desc(productPricesTable.createdAt))
		.limit(1);

	let result: ProductPrice | null = null;
	if (latestPrice) {
		result = latestPrice;
	}
	return result;
}
