// SPDX-License-Identifier: AGPL-3.0-or-later
import { getProductTagline } from '@/app/actions';

type Props = { systemId: string };

/** Fetches and renders the product tagline from Harper (always fresh; used inside Suspense for PPR). */
export async function ProductTagline({ systemId }: Props) {
  const tagline = await getProductTagline(systemId);

  if (!tagline?.tagline) {
    return null;
  }
  return (
    <p className="product-detail-tagline" style={{ fontStyle: 'italic', color: 'var(--color-muted)' }}>
      {tagline.tagline}
    </p>
  );
}
