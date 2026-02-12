// SPDX-License-Identifier: AGPL-3.0-or-later
import Link from 'next/link';
import Image from 'next/image';
import { Suspense } from 'react';
import { getProductsByCategory, getCategories } from '@/app/actions';
import type { ProductListItem } from '@/schema/product-catalog';
import type { Metadata } from 'next';

// Enable ISR for category listing pages (revalidate cached HTML/data periodically).
export const revalidate = 60;

// export async function generateStaticParams() {
//   const categories = await getCategories();
//   return categories.map((c) => ({ slug: c.slug }));
// }

function productImageSrc(images: string[]): string {
  const first = images?.[0];
  if (!first) return '/images/missing-product.png';
  return first.startsWith('images/') ? `/${first}` : `/images/${first}`;
}

const SLUG_TO_NAME: Record<string, string> = {
  mens: 'Mens',
  womens: 'Womens',
  baby: 'Baby',
  boys: 'Boys',
  girls: 'Girls',
};

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const name = SLUG_TO_NAME[slug] ?? slug;
  return {
    title: `${name} — Composable!`,
    description: `Shop ${name} at Composable! — Where style meets versatility.`,
  };
}

async function CategoryContent({ slug }: { slug: string }) {
  const [products, categories] = await Promise.all([
    getProductsByCategory(slug),
    getCategories(),
  ]);
  const isValid = categories.some((c) => c.slug === slug);

  if (!isValid) {
    return (
      <div className="empty-state">
        <p>Category not found.</p>
        <Link href="/" className="back-link">
          ← Back to home
        </Link>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="empty-state">
        <p>No products in this category yet.</p>
      </div>
    );
  }

  return (
    <div className="product-grid">
      {products.map((p: ProductListItem) => (
        <Link key={p.id} href={`/product/${p.id}`} className="product-card">
          <div className="product-card-image-wrap">
            <Image
              className="product-card-image"
              src={productImageSrc(p.images)}
              alt={p.title}
              width={240}
              height={240}
              unoptimized
            />
          </div>
          <div className="product-card-body">
            <h3 className="product-card-title">{p.title}</h3>
            <p className="product-card-price">{p.price || p.list_price}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function CategoryFallback() {
  return (
    <div className="empty-state" aria-busy="true">
      <p>Loading…</p>
    </div>
  );
}

async function CategoryPageContent({ params }: Props) {
  const { slug } = await params;
  const categoryName = SLUG_TO_NAME[slug] ?? slug;

  return (
    <>
      <h1 className="page-title">{categoryName}</h1>
      <CategoryContent slug={slug} />
    </>
  );
}

export default function CategoryPage({ params }: Props) {
  return (
    <>
      <Link href="/" className="back-link">
        ← Back to home
      </Link>
      <Suspense fallback={<CategoryFallback />}>
        <CategoryPageContent params={params} />
      </Suspense>
    </>
  );
}
