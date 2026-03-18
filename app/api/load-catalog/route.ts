// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * POST /api/load-catalog — Load or refresh product catalog from data/composable-catalog.json
 * into the HarperDB Product table (upsert). Use for initial load and after catalog updates.
 *
 * WARNING! This is not a recommended pattern for a production application.
 *
 * Runs in HarperDB context when using harperdb run.
 */

import { readFile } from 'fs/promises';
import path from 'path';
import { verifyApiKey } from '@/lib/auth/api-key';
await import('harperdb');

function mapDetailToRecord(detail: Record<string, unknown>) {
	return {
		id: detail.system_id,
		url: detail.url ?? '',
		title: detail.title ?? '',
		brand: detail.brand ?? '',
		price: detail.price ?? '',
		price_value: detail.price_value ?? 0,
		currency: detail.currency ?? 'USD',
		sizes: Array.isArray(detail.sizes) ? detail.sizes : [],
		description: detail.description ?? '',
		product_details: Array.isArray(detail.product_details) ? detail.product_details : [],
		category: detail.category ?? '',
		images: Array.isArray(detail.images) ? detail.images : [],
		list_name: detail.list_name ?? '',
		list_price: detail.list_price ?? '',
	};
}

export async function POST(request: Request) {
	const authError = verifyApiKey(request);
	if (authError) return authError;

	try {
		const catalogPath = path.join(
			new URL('.', import.meta.url).pathname,
			'..',
			'..',
			'..',
			'data',
			'composable-catalog.json',
		  );
		// Log the resolved catalog path for debugging
		console.log('[load-catalog] Resolved catalogPath:', catalogPath);

		const raw = await readFile(catalogPath, 'utf-8');
		const catalog = JSON.parse(raw) as { details?: Record<string, unknown>[] };
		const details = catalog.details;

		if (!Array.isArray(details) || details.length === 0) {
			return Response.json({ loaded: 0, message: 'No details in catalog' }, { status: 200 });
		}

		const records = details.map(mapDetailToRecord);

		await tables.Product.operation({ operation: 'upsert', records }, undefined);

		return Response.json({
			loaded: records.length,
			message: `Loaded ${records.length} products into Product table`,
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return Response.json({ error: message }, { status: 500 });
	}
}
