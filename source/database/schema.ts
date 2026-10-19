import { pgTable, uuid, boolean, timestamp, integer, varchar, PgEnumColumn } from "drizzle-orm/pg-core";

export const productsTable = pgTable("products", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	marketplace: varchar("marketplace").default("OZON").notNull(),
	image: varchar("image"),
	title: varchar("title").notNull(),
	url: varchar("url").notNull().unique(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const productPriceTable = pgTable("product_price", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	productId: uuid("product_id")
		.notNull()
		.references(() => productsTable.id, { onDelete: "cascade" }),
	price: integer("price").notNull(),
	currency: varchar("currency", { length: 3 }).default("RUB").notNull(),
	inStock: boolean("is_in_stock").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
