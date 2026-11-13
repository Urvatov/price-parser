import { FastifySchema } from "fastify";

export const getProductsSchema: FastifySchema = {
	tags: ["Products"],
	summary: "Список всех товаров (с возможностью запросить последнюю цену)",
	querystring: {
		type: "object",
		properties: {
			price: { type: "boolean", default: false, description: "Прикреплять ли последнюю актуальную цену к товарам" }
		}
	},
	response: {
		200: {
			type: "object",
			properties: {
				success: { type: "boolean" },
				data: {
					type: "array",
					items: {
						type: "object",
						properties: {
							id: { type: "string" },
							sku: { type: "string" },
							marketplace: { type: "string" },
							title: { type: "string" },
							url: { type: "string" },
							image: { type: "string", nullable: true },
							isActive: { type: "boolean" },
							createdAt: { type: "string" },
							updatedAt: { type: "string" },
							latestPrice: {
								type: "object",
								nullable: true,
								properties: {
									id: { type: "string" },
									productId: { type: "string" },
									price: { type: "integer" },
									currency: { type: "string" },
									inStock: { type: "boolean" },
									createdAt: { type: "string" }
								}
							}
						}
					}
				}
			}
		}
	}
};

export const addProductSchema: FastifySchema = {
	tags: ["Products"],
	summary: "Добавить товар по ссылке или артикулу Ozon",
	body: {
		type: "object",
		required: ["url"],
		properties: {
			url: { type: ["string", "number"], description: "Ссылка на страницу товара Ozon или числовой артикул (SKU)" }
		}
	},
	response: {
		201: {
			type: "object",
			properties: {
				success: { type: "boolean" },
				data: {
					type: "object",
					properties: {
						id: { type: "string" },
						sku: { type: "string" },
						marketplace: { type: "string" },
						title: { type: "string" },
						url: { type: "string" },
						image: { type: "string", nullable: true },
						isActive: { type: "boolean" },
						createdAt: { type: "string" },
						updatedAt: { type: "string" },
						latestPrice: {
							type: "object",
							nullable: true,
							properties: {
								id: { type: "string" },
								productId: { type: "string" },
								price: { type: "integer" },
								currency: { type: "string" },
								inStock: { type: "boolean" },
								createdAt: { type: "string" }
							}
						}
					}
				}
			}
		}
	}
};

export const getProductByIdSchema: FastifySchema = {
	tags: ["Products"],
	summary: "Получить информацию о конкретном товаре по ID",
	params: { type: "object", required: ["id"], properties: { id: { type: "string" } } }
};

export const refreshProductSchema: FastifySchema = {
	tags: ["Products"],
	summary: "Поставить товар в приоритетную очередь на немедленный сбор цен",
	params: { type: "object", required: ["id"], properties: { id: { type: "string" } } }
};

export const getProductHistorySchema: FastifySchema = {
	tags: ["Products"],
	summary: "История изменения цен товара",
	params: { type: "object", required: ["id"], properties: { id: { type: "string" } } }
};

export const updateProductSchema: FastifySchema = {
	tags: ["Products"],
	summary: "Обновить свойства товара (название, активность)",
	params: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
	body: {
		type: "object",
		properties: {
			title: { type: "string", description: "Пользовательское название товара" },
			isActive: { type: "boolean", description: "Статус отслеживания товара" }
		}
	}
};

export const updateProductStatusSchema: FastifySchema = {
	tags: ["Products"],
	summary: "Включить или выключить отслеживание товара",
	params: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
	body: {
		type: "object",
		required: ["isActive"],
		properties: { isActive: { type: "boolean", description: "Статус отслеживания товара" } }
	}
};

export const deleteProductSchema: FastifySchema = {
	tags: ["Products"],
	summary: "Удалить товар из базы данных",
	params: { type: "object", required: ["id"], properties: { id: { type: "string" } } }
};
