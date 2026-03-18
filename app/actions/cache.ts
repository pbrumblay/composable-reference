// SPDX-License-Identifier: AGPL-3.0-or-later
import { revalidateTag } from 'next/cache';

export async function revalidateProduct() {
	revalidateTag('product', 'max');
}
export async function revalidateCategory() {
	revalidateTag('category', 'max');
}
export async function revalidateCatalog() {
	revalidateTag('catalog', 'max');
}
