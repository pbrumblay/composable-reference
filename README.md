# Composable! — Reference Ecommerce

**Where style meets versatility.**

A reference ecommerce app built with [Next.js](https://nextjs.org/) and [HarperDB](https://harperdb.io/), using the [@harperdb/nextjs](https://github.com/HarperFast/nextjs) component. Runs locally and is deployable to HarperCloud (no Docker).

## Pages

1. **Home** (`/`) — Hero, categories, and all products.
2. **Category** (`/category/[slug]`) — Products by category (mens, womens, baby, boys, girls).
3. **Product detail** (`/product/[systemId]`) — Full product info and gallery.

## Tech stack

- **Node.js** 22+
- **Next.js** 16 (App Router)
- **TypeScript**
- **HarperDB** 4.7 (schema + custom function for catalog load)
- **React** 19

## Quick start

### 1. Install and run

```bash
npm install
harperdb run composable-reference
```

Or use the Harper Next.js CLI:

```bash
npm run dev    # dev mode with HMR
npm run build  # production build
npm run start  # production start (after build)
```

When using `harperdb run composable-reference`, the app is served on the HarperDB HTTP port (typically **9926**). Open [http://localhost:9926](http://localhost:9926).

**Note:** Use `harperdb-nextjs build` (or `harperdb run` before building) when you need HarperDB at build time. A plain `next build` works for type-checking and static pages; the `harperdb` module is provided by the HarperDB runtime at run time.

### 2. Load the product catalog

The catalog is stored in `data/composable-catalog.json`. To populate the HarperDB `Product` table (and refresh it), call the API route:

```bash
curl -X POST http://localhost:9926/api/load-catalog
```

This reads `data/composable-catalog.json` and upserts all products into the `Product` table. Run it after starting HarperDB and whenever you update the catalog.

### 3. (Optional) Product taglines from CMS

Product taglines are loaded from a fictional external CMS and cached in Harper with a 3-minute TTL (read-through). The source lives in `resources/product-tagline.ts` and is included in the barrel file `resources/index.ts` .

1. Copy env and set values (see `.env.example`). Harper loads `.env` via the built-in `loadEnv` component in `config.yaml`, so `ProductTaglineSource` can read `CMS_URL` and `CMS_API_KEY`.

   ```bash
   cp .env.example .env
   # Set CMS_URL (e.g. http://localhost:7999) and CMS_API_KEY
   ```

2. Run a mock CMS on port 7999 that responds to `GET /product/{systemId}/tagline` with JSON `{ "tagline": "…" }`. The Harper `ProductTaglineSource` fetches that URL with `Authorization: Bearer {CMS_API_KEY}`. Run `npm run build:harper` (or `npm run build`) so `harper/resources.js` is up to date.

## Project layout

| Path | Purpose |
|------|--------|
| `schema.graphql` | HarperDB table definition (Product, ProductTagline). Used for GraphQL and REST. |
| `config.yaml` | Harper component config: Next.js, GraphQL, jsResource, custom routes. |
| `resources/index.ts` | Harper custom resources (TypeScript); ProductTagline source fetches from (fake) CMS directly. |
| `app/api/load-catalog/route.ts` | Next.js API route: POST `/api/load-catalog` to load/refresh catalog. |
| `data/composable-catalog.json` | Source product catalog (list + details). |
| `app/` | Next.js App Router: layout, home, category, product pages, actions. |
| `types/` | TypeScript types |
| `public/images/` | Static images served at `/images/`. |


## Catalog refresh

```http
POST http://<your-instance>/api/load-catalog
```

## License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.  
See [LICENSE](LICENSE) for the full text. In short: you may use, modify, and distribute this software under the same license, and if you run a modified version on a network server, you must offer the corresponding source to users who interact with it.

