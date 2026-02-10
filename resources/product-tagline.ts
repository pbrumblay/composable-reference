import { Resource, RequestTarget } from 'harperdb';
import { tables } from 'harperdb';

interface ProductTaglineRecord {
  id: string;
  tagline: string;
}

const CMS_URL = process.env.CMS_URL ?? '';
const CMS_API_KEY = process.env.CMS_API_KEY ?? '';

class ProductTaglineSource extends Resource {
    async get(target: RequestTarget): Promise<ProductTaglineRecord> {
      const id = target.id;
      const idStr = Array.isArray(id) ? id.join('/') : String(id ?? '');

      if (!CMS_URL || !CMS_API_KEY) {
        throw new Error('ProductTaglineSource: CMS_URL and CMS_API_KEY must be set');
      }

      const base = CMS_URL.replace(/\/$/, '');
      const url = `${base}/product/${encodeURIComponent(idStr)}/tagline`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${CMS_API_KEY}`,
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        if (res.status === 404) return { id: idStr, tagline: '' };
        throw new Error(`ProductTagline source failed: ${res.status}`);
      }

      const data = await res.json();
      return {
        id: data.id ?? idStr,
        tagline: data.tagline ?? '',
      };
    }
}

const { ProductTagline } = tables;
ProductTagline.sourcedFrom(ProductTaglineSource, {});