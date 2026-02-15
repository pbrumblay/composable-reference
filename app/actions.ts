import { revalidateTag } from 'next/cache'

export * from './db/products';

export async function revalidateProduct() {
  revalidateTag('product', 'max');
}
export async function revalidateCategory() {
  revalidateTag('category', 'max');
}
export async function revalidateCatalog() {
  revalidateTag('catalog', 'max'); // everything in the catalog
}
