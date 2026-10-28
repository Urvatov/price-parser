import { type productPricesTable, type productsTable } from "./schema.js";

// productsTable
export type Product = typeof productsTable.$inferSelect;
export type NewProduct = typeof productsTable.$inferInsert;

export type Marketplace = typeof productsTable.marketplace.enumValues[number];

// productPricesTable
export type ProductPrice = typeof productPricesTable.$inferSelect;
export type NewProductPrice = typeof productPricesTable.$inferInsert;
