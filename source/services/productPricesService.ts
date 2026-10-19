import db from "../database/client.js";
import { productPriceTable } from "../database/schema.js";

export async function addProductPrice(newProductPrice: any) {
	const [addedProductPrice] = await db.insert(productPriceTable).values(newProductPrice).returning();

	return addedProductPrice;
}
