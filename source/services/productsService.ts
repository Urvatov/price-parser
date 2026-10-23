import { desc, eq } from "drizzle-orm";
import db from "../database/client.js";
import { productPricesTable, productsTable } from "../database/schema.js";
import type { NewProduct, Product } from "../database/types.js";

type MarketplaceName = "OZON" | "WILDBERRIES" | "YANDEX_MARKET" | "AVITO";

export type UpdateProductPayload = Partial<Omit<NewProduct, "id" | "createdAt">>;

export interface ProductWithLatestPrice extends Product {
	latestPrice: {
		id: string;
		productId: string;
		price: number;
		currency: string;
		inStock: boolean;
		createdAt: Date;
	} | null;
}

export async function createProduct(newProduct: NewProduct): Promise<Product> {
	const [addedProduct] = await db.insert(productsTable).values(newProduct).returning();
	return addedProduct;
}

export async function getProducts(): Promise<Product[]> {
	const products = await db.select().from(productsTable);
	return products;
}

export async function getProductsWithLatestPrice(): Promise<ProductWithLatestPrice[]> {
	const latestPricesSubquery = db
		.selectDistinctOn([productPricesTable.productId], {
			id: productPricesTable.id,
			productId: productPricesTable.productId,
			price: productPricesTable.price,
			currency: productPricesTable.currency,
			inStock: productPricesTable.inStock,
			createdAt: productPricesTable.createdAt
		})
		.from(productPricesTable)
		.orderBy(productPricesTable.productId, desc(productPricesTable.createdAt))
		.as("latest_prices");

	const rows = await db
		.select({
			product: productsTable,
			priceId: latestPricesSubquery.id,
			priceProductId: latestPricesSubquery.productId,
			priceValue: latestPricesSubquery.price,
			priceCurrency: latestPricesSubquery.currency,
			priceInStock: latestPricesSubquery.inStock,
			priceCreatedAt: latestPricesSubquery.createdAt
		})
		.from(productsTable)
		.leftJoin(latestPricesSubquery, eq(productsTable.id, latestPricesSubquery.productId));

	const productsWithPrice: ProductWithLatestPrice[] = [];
	for (const row of rows) {
		let latestPrice = null;
		if (row.priceId !== null && row.priceProductId !== null && row.priceValue !== null) {
			latestPrice = {
				id: row.priceId,
				productId: row.priceProductId,
				price: row.priceValue,
				currency: row.priceCurrency as string,
				inStock: row.priceInStock as boolean,
				createdAt: row.priceCreatedAt as Date
			};
		}

		const item: ProductWithLatestPrice = {
			...row.product,
			latestPrice: latestPrice
		};
		productsWithPrice.push(item);
	}

	return productsWithPrice;
}

export async function getProductsByMarketplace(marketplaceName: MarketplaceName): Promise<Product[]> {
	const products = await db.select().from(productsTable).where(eq(productsTable.marketplace, marketplaceName));
	return products;
}

export async function getProductById(productId: string): Promise<Product | null> {
	const [product] = await db.select().from(productsTable).where(eq(productsTable.id, productId));
	let result: Product | null = null;
	if (product) {
		result = product;
	}
	return result;
}

export async function getProductByUrl(url: string): Promise<Product | null> {
	const [product] = await db.select().from(productsTable).where(eq(productsTable.url, url));
	let result: Product | null = null;
	if (product) {
		result = product;
	}
	return result;
}

export async function updateProduct(productId: string, payload: UpdateProductPayload): Promise<Product | null> {
	const [updatedProduct] = await db
		.update(productsTable)
		.set({
			...payload,
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

export async function deleteProduct(productId: string): Promise<Product | null> {
	const [deletedProduct] = await db.delete(productsTable).where(eq(productsTable.id, productId)).returning();
	let result: Product | null = null;
	if (deletedProduct) {
		result = deletedProduct;
	}
	return result;
}
