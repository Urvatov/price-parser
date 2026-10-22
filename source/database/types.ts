import { type productPricesTable, type productsTable } from "./schema.js";

export type Product = typeof productsTable.$inferSelect;
export type NewProduct = typeof productsTable.$inferInsert;

export type ProductPrice = typeof productPricesTable.$inferSelect;
export type NewProductPrice = typeof productPricesTable.$inferInsert;
