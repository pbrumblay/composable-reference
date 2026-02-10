import Link from 'next/link';
import { getProductBySystemId, getProductSystemIds } from '@/app/actions';
import { CATEGORY_TO_SLUG } from '@/schema/product-catalog';
import type { Metadata } from 'next';
import { ProductGallery } from './ProductGallery';
import { ProductTagline } from './ProductTagline';
import { Suspense } from 'react';

// Enable ISR for product detail pages (revalidate cached HTML/data periodically).
export const revalidate = 60;

type Props = { params: Promise<{ systemId: string }> };

export async function generateStaticParams() {
  const ids = await getProductSystemIds();
  return ids.map((systemId) => ({ systemId }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { systemId } = await params;
  const product = await getProductBySystemId(systemId);
  if (!product) return { title: 'Product — Composable!' };
  return {
    title: `${product.title} — Composable!`,
    description: product.description || undefined,
  };
}

export default async function ProductDetailPage({ params }: Props) {
 
  const { systemId } = await params;
  const product = await getProductBySystemId(systemId);

  if (!product) {
    return (
      <div className="empty-state">
        <p>Product not found.</p>
        <Link href="/" className="back-link">
          ← Back to home
        </Link>
      </div>
    );
  }

  const categorySlug = CATEGORY_TO_SLUG[product.category] ?? product.category.toLowerCase();
  const images = product.images?.length ? product.images : ['images/missing-product.png'];

  return (
    <>
      <Link href={`/category/${categorySlug}`} className="back-link">
        ← Back to {product.category}
      </Link>

      <article className="product-detail">
        <ProductGallery images={images} title={product.title} />
        <div className="product-detail-info">
          <h1>{product.title}</h1>
          <Suspense fallback={<p className="product-detail-tagline" style={{ fontStyle: 'italic', color: 'var(--color-muted)' }} aria-hidden>…</p>}>
            <ProductTagline systemId={systemId} />          
          </Suspense>
          <p className="product-detail-price">{product.price}</p>
          <p className="product-detail-description">{product.description}</p>
          {product.product_details?.length ? (
            <ul className="product-detail-list">
              {product.product_details.map((detail, i) => (
                <li key={i}>{detail}</li>
              ))}
            </ul>
          ) : null}
          {product.sizes?.length ? (
            <p style={{ fontSize: '0.9rem', color: 'var(--color-muted)' }}>
              Sizes: {product.sizes.join(', ')}
            </p>
          ) : null}
        </div>
      </article>
    </>
  );
}
