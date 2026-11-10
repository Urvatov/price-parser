export interface ProductPrice {
	id: string;
	price: number | null;
	inStock: boolean;
}

export interface ProductCardData {
	id: string;
	title: string;
	marketplace: string;
	image?: string | null;
	latestPrice: ProductPrice | null;
}

export interface ApiResponse {
	success: boolean;
	data: ProductCardData[];
}
