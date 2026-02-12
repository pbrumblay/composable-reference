// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';

import { useState } from 'react';
import Image from 'next/image';

function productImageSrc(path: string): string {
  if (!path) return '/images/missing-product.png';
  return path.startsWith('images/') ? `/${path}` : `/images/${path}`;
}

type Props = {
  images: string[];
  title: string;
};

export function ProductGallery({ images, title }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const mainImage = images[selectedIndex];

  return (
    <div className="product-detail-gallery">
      <div className="product-detail-gallery-main">
        <Image
          src={productImageSrc(mainImage)}
          alt={title}
          width={500}
          height={500}
          unoptimized
        />
      </div>
      {images.length > 1 && (
        <div className="product-detail-gallery-thumbnails" role="tablist" aria-label="Product images">
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === selectedIndex}
              aria-label={`View image ${i + 1}`}
              className={`product-detail-thumbnail ${i === selectedIndex ? 'is-selected' : ''}`}
              onClick={() => setSelectedIndex(i)}
            >
              <Image
                src={productImageSrc(img)}
                alt=""
                width={80}
                height={80}
                unoptimized
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
