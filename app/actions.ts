// SPDX-License-Identifier: AGPL-3.0-or-later
'use server';

import type { Product, ProductListItem, ProductTagline } from '@/schema/product-catalog';

// Load HarperDB once at module load; runtime then exposes global `tables`. Turbopack-friendly (no webpack).
await import('harperdb');

function toListItem(p: { id: string; title: string; price: string; list_price: string; url: string; category: string; images: string[] }): ProductListItem {
  return {
    id: p.id,
    title: p.title ?? '',
    price: p.price ?? p.list_price ?? '',
    list_price: p.list_price ?? '',
    url: p.url ?? '',
    category: p.category ?? '',
    images: Array.isArray(p.images) ? p.images : [],
  };
}

const SLUG_TO_CATEGORY: Record<string, string> = {
  mens: 'Mens',
  womens: 'Womens',
  baby: 'Baby',
  boys: 'Boys',
  girls: 'Girls',
};

export async function getProductsByCategory(categorySlug: string): Promise<ProductListItem[]> {
  try {
    const category = SLUG_TO_CATEGORY[categorySlug.toLowerCase()] ?? categorySlug;

    const items: ProductListItem[] = [];
    for await (const row of tables.Product.search({ conditions: [ { attribute: 'category', value: category } ]})) {
      items.push(toListItem(row as Parameters<typeof toListItem>[0]));
    }
    return items;
  } catch (err) {
    console.error('getProductsByCategory error', err);
    return [];
  }
}

export async function getProductBySystemId(systemId: string): Promise<Product | null> {
  try {
    const row = await tables.Product.get(systemId);
    if (!row) return null;
    const r = row as Record<string, unknown>;
    const product: Product = {
      id: String(r.id ?? ''),
      url: String(r.url ?? ''),
      title: String(r.title ?? ''),
      brand: String(r.brand ?? ''),
      price: String(r.price ?? ''),
      price_value: Number(r.price_value ?? 0),
      currency: String(r.currency ?? 'USD'),
      sizes: Array.isArray(r.sizes) ? (r.sizes as string[]) : [],
      description: String(r.description ?? ''),
      product_details: Array.isArray(r.product_details) ? (r.product_details as string[]) : [],
      category: String(r.category ?? ''),
      images: Array.isArray(r.images) ? (r.images as string[]) : [],
      list_name: String(r.list_name ?? ''),
      list_price: String(r.list_price ?? ''),
    };
    return product;
  } catch (err) {
    console.error('getProductBySystemId error', err);
    return null;
  }
}

export async function getCategories(): Promise<{ slug: string; name: string }[]> {
  return [
    { slug: 'mens', name: 'Mens' },
    { slug: 'womens', name: 'Womens' },
    { slug: 'baby', name: 'Baby' },
    { slug: 'boys', name: 'Boys' },
    { slug: 'girls', name: 'Girls' },
  ];
}

/** All product ids for generateStaticParams (ISR cache keys per product). */
export async function getProductSystemIds(): Promise<string[]> {
  try {
    const ids: string[] = [];
    for await (const row of tables.Product.search({})) {
      ids.push(String((row as { id: string }).id));
    }
    return ids;
  } catch (err) {
    console.error('getProductSystemIds error', err);
    return [];
  }
}

/** Get product tagline from CMS via Harper ProductTagline (read-through cache, 3 min TTL). */
export async function getProductTagline(systemId: string): Promise<ProductTagline | null> {
  try {
    const row = await tables.ProductTagline.get(systemId);
    if (!row) return null;
    const r = row as Record<string, unknown>;
    const out = {
      id: String(r.id ?? ''),
      tagline: String(r.tagline ?? ''),
    };
    return out;
  } catch (err) {
    const isPrerenderCutoff =
      err instanceof Error &&
      (err.message.includes('prerender is complete') || (err as { digest?: string }).digest === 'HANGING_PROMISE_REJECTION');
    if (!isPrerenderCutoff) {
      console.error('getProductTagline error', err);
    }
    return null;
  }
}
