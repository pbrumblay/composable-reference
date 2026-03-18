// SPDX-License-Identifier: AGPL-3.0-or-later
import 'server-only';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY ?? '';

/**
 * Verify that the request carries a valid `Authorization: Bearer <key>` header
 * matching INTERNAL_API_KEY.  Returns a 401/403 Response on failure, or null on success.
 */
export function verifyApiKey(request: Request): Response | null {
	if (!INTERNAL_API_KEY) {
		return Response.json({ error: 'INTERNAL_API_KEY is not configured' }, { status: 500 });
	}

	const header = request.headers.get('Authorization') ?? '';
	const token = header.startsWith('Bearer ') ? header.slice(7) : '';

	if (!token) {
		return Response.json({ error: 'Missing Authorization header' }, { status: 401 });
	}

	if (token !== INTERNAL_API_KEY) {
		return Response.json({ error: 'Invalid API key' }, { status: 403 });
	}

	return null;
}
