import { desc, eq } from "drizzle-orm";
import db from "../database/client.js";
import { productPricesTable } from "../database/schema.js";
import { NewProductPrice, ProductPrice } from "../database/types.js";

export async function createPrice(newPrice: NewProductPrice): Promise<ProductPrice> {
	const [addedPrice] = await db.insert(productPricesTable).values(newPrice).returning();
	return addedPrice;
}

export async function getPriceHistory(productId: string): Promise<ProductPrice[]> {
	const prices = await db.select().from(productPricesTable).where(eq(productPricesTable.productId, productId)).orderBy(
		desc(productPricesTable.createdAt)
	);
	return prices;
}

export async function getLatestPrice(productId: string): Promise<ProductPrice | null> {
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
