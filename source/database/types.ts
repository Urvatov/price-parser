import type { productPriceTable, productsTable } from "./schema.js";

export type Product = typeof productsTable.$inferSelect;
export type NewProduct = typeof productsTable.$inferSelect;

export type ProductPrice = typeof productPriceTable.$inferSelect;
export type NewProductPrice = typeof productPriceTable.$inferInsert;
