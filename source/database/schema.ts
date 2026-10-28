import { boolean, index, integer, pgEnum, pgTable, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

export const marketplaceEnum = pgEnum("marketplace_enum", ["OZON", "WILDBERRIES", "YANDEX_MARKET", "AVITO"]);
export const priorityEnum = pgEnum("priority_enum", ["HIGH", "MEDIUM", "LOW"]);

export const productsTable = pgTable("products", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	marketplace: marketplaceEnum("marketplace").notNull(),
	sku: varchar("sku", { length: 64 }).notNull(),
	title: varchar("title").notNull(),
	url: varchar("url").notNull().unique(),
	image: varchar("image"),
	isActive: boolean("is_active").default(true).notNull(),
	priority: priorityEnum("priority").default("LOW"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [
	uniqueIndex("products_marketplace_sku_unique_index").on(table.marketplace, table.sku)
]);

export const productPricesTable = pgTable("product_prices", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	productId: uuid("product_id").references(() => productsTable.id, { onDelete: "cascade" }).notNull(),
	price: integer("price"),
	currency: varchar("currency", { length: 3 }).default("RUB"),
	inStock: boolean("is_in_stock").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [
	index("product_prices_product_id_created_at_idx").on(table.productId, table.createdAt.desc())
]);
