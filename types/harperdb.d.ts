// SPDX-License-Identifier: AGPL-3.0-or-later
import { ProductCatalogSchema } from 'schema/product-catalog';

declare module 'harperdb' {
  interface Table<T> {
    get(id: string | number): Promise<T | undefined>;
    put(record: Partial<T>): Promise<void>;
    search(target: any): AsyncIterable<T>; 
    delete(id: string | number): Promise<void>;
    operation(operation: { operation: string, records: any[] }, ctx: any): Promise<void>;
    sourcedFrom(source: any, options: any): void;
  }

  export const tables: {
    [K in keyof ProductCatalogSchema]: Table<ProductCatalogSchema[K]>;
  };
  
  export abstract class Resource {
    static get(req: any, ctx: any): Promise<any>;
  }
  export class RequestTarget {
    conditions: Array<{attribute: string, value: any, comparator?: string}>;
    isCollection: boolean;
  }
}

global {
  const tables: {
    [K in keyof ProductCatalogSchema]: Table<ProductCatalogSchema[K]>;
  };
}