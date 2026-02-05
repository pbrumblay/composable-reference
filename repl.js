#!/usr/bin/env node

/**
 * HarperDB REPL - Interactive database shell
 * 
 * Usage: node repl.js
 * 
 * Available globals:
 *   - tables: HarperDB tables object (tables.Product, tables.ProductTagline, etc.)
 *   - query(table, conditions): Helper to search a table
 *   - get(table, id): Helper to get a record by ID
 *   - list(table, limit): Helper to list records
 */

import repl from 'node:repl';
import { tables } from 'harperdb';

// Helper functions for the REPL
const helpers = {
  /**
   * Query a table with conditions
   * @example await query('Product', [{ attribute: 'category', value: 'Mens' }])
   */
  async query(tableName, conditions = []) {
    const table = tables[tableName];
    if (!table) {
      throw new Error(`Table "${tableName}" not found. Available: ${Object.keys(tables).join(', ')}`);
    }
    const results = [];
    const searchOptions = conditions.length > 0 ? { conditions } : {};
    for await (const row of table.search(searchOptions)) {
      results.push(row);
    }
    return results;
  },

  /**
   * Get a single record by ID
   * @example await get('Product', 'some-id')
   */
  async get(tableName, id) {
    const table = tables[tableName];
    if (!table) {
      throw new Error(`Table "${tableName}" not found. Available: ${Object.keys(tables).join(', ')}`);
    }
    return await table.get(id);
  },

  /**
   * List records from a table (with optional limit)
   * @example await list('Product', 10)
   */
  async list(tableName, limit = 10) {
    const table = tables[tableName];
    if (!table) {
      throw new Error(`Table "${tableName}" not found. Available: ${Object.keys(tables).join(', ')}`);
    }
    const results = [];
    let count = 0;
    for await (const row of table.search({})) {
      results.push(row);
      count++;
      if (count >= limit) break;
    }
    return results;
  },

  /**
   * Count records in a table
   * @example await count('Product', [{ attribute: 'category', value: 'Mens' }])
   */
  async count(tableName, conditions = []) {
    const table = tables[tableName];
    if (!table) {
      throw new Error(`Table "${tableName}" not found. Available: ${Object.keys(tables).join(', ')}`);
    }
    let count = 0;
    const searchOptions = conditions.length > 0 ? { conditions } : {};
    for await (const row of table.search(searchOptions)) {
      count++;
    }
    return count;
  },

  /**
   * Show all available tables
   */
  showTables() {
    return Object.keys(tables);
  },
};

// Start the REPL
console.log('🗄️  HarperDB REPL');
console.log('═══════════════════════════════════════════════════════');
console.log('Available globals:');
console.log('  • tables       - HarperDB tables object');
console.log('  • query()      - Query a table');
console.log('  • get()        - Get a record by ID');
console.log('  • list()       - List records (default: 10)');
console.log('  • count()      - Count records');
console.log('  • showTables() - Show all available tables');
console.log('');
console.log('Examples:');
console.log('  await list("Product", 5)');
console.log('  await query("Product", [{ attribute: "category", value: "Mens" }])');
console.log('  await get("Product", "some-id")');
console.log('  await count("Product")');
console.log('  for await (const p of tables.Product.search({})) { console.log(p.title); }');
console.log('═══════════════════════════════════════════════════════');
console.log('');

const replServer = repl.start({
  prompt: 'harperdb> ',
  useColors: true,
});

// Add helper functions to the REPL context
Object.assign(replServer.context, {
  tables,
  ...helpers,
});

// Handle errors gracefully
replServer.on('exit', () => {
  console.log('\n👋 Goodbye!');
  process.exit(0);
});
