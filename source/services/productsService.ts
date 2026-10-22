import { eq } from "drizzle-orm";
import db from "../database/client.js";
import { productsTable } from "../database/schema.js";
import type { NewProduct, Product } from "../database/types.js";

type MarketplaceName = "OZON" | "WILDBERRIES" | "YANDEX_MARKET" | "AVITO";

export async function addProduct(newProduct: NewProduct): Promise<Product> {
	const [addedProduct] = await db.insert(productsTable).values(newProduct).returning();
	return addedProduct;
}

export async function getAllProducts(): Promise<Product[]> {
	const products = await db.select().from(productsTable);
	return products;
}

export async function getAllProductsOfMarketplace(marketplaceName: MarketplaceName): Promise<Product[]> {
	const products = await db.select().from(productsTable).where(eq(productsTable.marketplace, marketplaceName));
	return products;
}

export async function getProductByUrl(url: string): Promise<Product | null> {
	const [product] = await db.select().from(productsTable).where(eq(productsTable.url, url));
	let result: Product | null = null;
	if (product) {
		result = product;
	}
	return result;
}

export async function getSpecificProduct(productId: Product["id"]): Promise<Product | null> {
	const [product] = await db.select().from(productsTable).where(eq(productsTable.id, productId));
	let result: Product | null = null;
	if (product) {
		result = product;
	}
	return result;
}

export async function deleteProduct(productId: Product["id"]): Promise<Product | null> {
	const [deletedProduct] = await db.delete(productsTable).where(eq(productsTable.id, productId)).returning();
	let result: Product | null = null;
	if (deletedProduct) {
		result = deletedProduct;
	}
	return result;
}

export async function updateProductDetails(productId: string, details: { sku?: string; image?: string; }) {
	const [updatedProduct] = await db
		.update(productsTable)
		.set({
			sku: details.sku,
			image: details.image,
			updatedAt: new Date()
		})
		.where(eq(productsTable.id, productId))
		.returning();

	return updatedProduct;
}

export async function setProductActiveStatus(productId: string, isActive: boolean): Promise<Product | null> {
	const [updatedProduct] = await db
		.update(productsTable)
		.set({
			isActive: isActive,
			updatedAt: new Date()
		})
		.where(eq(productsTable.id, productId))
		.returning();

	let result: Product | null = null;
	if (updatedProduct) {
		result = updatedProduct;
	}
	return result;
}
