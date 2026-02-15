// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * POST /api/invalidate-cache — Revalidate cache by tag.
 * Body: { "tag": "product" | "category" | "catalog" }
 *
 * Example:
 *   curl -X POST http://localhost:9926/api/invalidate-cache \
 *     -H "Content-Type: application/json" \
 *     -d '{"tag":"catalog"}'
 */

import { revalidateProduct, revalidateCategory, revalidateCatalog } from '@/app/actions';

const tagHandlers: Record<string, () => Promise<void>> = {
	product: revalidateProduct,
	category: revalidateCategory,
	catalog: revalidateCatalog,
};

export async function POST(request: Request) {
	try {
		const body = await request.json().catch(() => ({}));
		const tag = typeof body?.tag === 'string' ? body.tag.trim().toLowerCase() : '';

		const handler = tagHandlers[tag];
		if (!handler) {
			const allowed = Object.keys(tagHandlers).join(', ');
			return Response.json(
				{ error: `Invalid or missing "tag". Allowed: ${allowed}` },
				{ status: 400 }
			);
		}

		await handler();
		return Response.json({ revalidated: tag });
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return Response.json({ error: message }, { status: 500 });
	}
}
