import { and, desc, eq } from "drizzle-orm";
import db from "../database/client.js";
import { productPricesTable, productsTable } from "../database/schema.js";
import type { Marketplace, NewProduct, Product, ProductPrice } from "../database/types.js";

export type UpdateProductPayload = Partial<Omit<NewProduct, "id" | "createdAt">>;

export interface ProductWithLatestPrice extends Product {
    latestPrice: ProductPrice | null;
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
    const products = await db.query.productsTable.findMany({
        with: {
            prices: {
                orderBy: (prices, { desc }) => [desc(prices.createdAt)],
                limit: 1
            }
        }
    });

    const productsWithPrice: ProductWithLatestPrice[] = [];

    for (const product of products) {
        const { prices, ...productData } = product;

        let latestPrice = null;
        if (prices.length > 0) {
            latestPrice = prices[0];
        }

        const item: ProductWithLatestPrice = {
            ...productData,
            latestPrice: latestPrice
        };

        productsWithPrice.push(item);
    }

    return productsWithPrice;
}

export async function getProductsByMarketplace(marketplace: Marketplace): Promise<Product[]> {
	const products = await db
		.select()
		.from(productsTable)
		.where(
			and(
				eq(productsTable.marketplace, marketplace),
				eq(productsTable.isActive, true)
			)
		);
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
		.set({ ...payload, updatedAt: new Date() })
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
