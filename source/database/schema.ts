import { boolean, integer, pgEnum, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const marketplaceEnum = pgEnum("marketplace_enum", ["OZON", "WILDBERRIES", "YANDEX_MARKET", "AVITO"]);

export const productsTable = pgTable("products", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	sku: varchar("sku", { length: 64 }).notNull(),
	marketplace: marketplaceEnum("marketplace").notNull(),
	title: varchar("title").notNull(),
	url: varchar("url").notNull().unique(),
	image: varchar("image"),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const productPricesTable = pgTable("product_prices", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	productId: uuid("product_id")
		.references(() => productsTable.id, { onDelete: "cascade" })
		.notNull(),
	price: integer("price").notNull(),
	currency: varchar("currency", { length: 3 }).default("RUB").notNull(),
	inStock: boolean("is_in_stock").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
