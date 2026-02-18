// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Product type matching HarperDB schema (schema.graphql) and catalog details.
 */
export interface Product {
	id: string;
	url: string;
	title: string;
	brand: string;
	price: string;
	price_value: number;
	currency: string;
	sizes: string[];
	description: string;
	product_details: string[];
	category: string;
	images: string[];
	list_name: string;
	list_price: string;
	color: string[];
	fabric: string[];
	pattern: string[];
}

export interface ProductListItem {
	id: string;
	title: string;
	price: string;
	list_price: string;
	url: string;
	category: string;
	images: string[];
}

/** Product tagline from CMS (Harper ProductTagline read-through cache). */
export interface ProductTagline {
	id: string;
	tagline: string;
}

/** Category slugs used in URLs (lowercase). */
export const CATEGORY_SLUGS = ['mens', 'womens', 'baby', 'boys', 'girls'] as const;

/** Map category display name to URL slug. */
export const CATEGORY_TO_SLUG: Record<string, string> = {
	Mens: 'mens',
	Womens: 'womens',
	Baby: 'baby',
	Boys: 'boys',
	Girls: 'girls',
};

export const SLUG_TO_CATEGORY: Record<string, string> = Object.fromEntries(
	Object.entries(CATEGORY_TO_SLUG).map(([k, v]) => [v, k])
);

/** Category list for nav/config; safe to use in client and server. */
export const CATEGORIES: { slug: string; name: string }[] = CATEGORY_SLUGS.map((slug) => ({
	slug,
	name: SLUG_TO_CATEGORY[slug] ?? slug,
}));

export interface ProductCatalogSchema {
	Product: Product;
	ProductTagline: ProductTagline;
}
