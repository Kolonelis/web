#!/usr/bin/env node
/**
 * import-csv.js — Import watches from CSV into data/products.json
 *
 * Usage:
 *   node scripts/import-csv.js <input.csv> [--dry-run]
 *   node scripts/import-csv.js data/imports/casio.csv
 *
 * CSV columns (required): id,name,brand,gender,category,stock,price,image
 * CSV columns (optional): description,featured,images,variants,specs,groupId
 *
 * - images: JSON array string e.g. '["url1","url2"]'
 * - variants: JSON array string e.g. '[{"id":1,"color":"Silver","colorCode":"#C0C0C0","price":1000,"images":["url"]}]'
 * - specs: JSON object string e.g. '{"Механізм":"Автоматичний","Корпус":"Сталь"}'
 * - featured: "true"/"false"
 * - stock: "in" | "low" | "pre"
 * - gender: "men" | "women"
 * - category: "auto" | "quartz" | "chrono" | "luxury"
 */

const fs = require('fs');
const path = require('path');

const PRODUCTS_FILE = path.resolve(__dirname, '../data/products.json');
const CSV_DELIMITER = ',';

// Helper: parse CSV line respecting quotes
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === CSV_DELIMITER && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// Helper: safely parse JSON
function safeParseJSON(str, fallback) {
  if (!str || str.trim() === '') return fallback;
  try {
    return JSON.parse(str);
  } catch {
    console.warn(`Warning: Failed to parse JSON: ${str.substring(0, 50)}...`);
    return fallback;
  }
}

// Helper: parse boolean
function parseBool(str) {
  if (!str) return false;
  const v = str.trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

// Helper: validate required fields
function validateRow(row, headers, lineNum) {
  const required = ['id', 'name', 'brand', 'gender', 'category', 'stock', 'price', 'image'];
  const missing = required.filter(f => {
    const idx = headers.indexOf(f);
    return idx === -1 || !row[idx] || row[idx].trim() === '';
  });

  if (missing.length > 0) {
    throw new Error(`Line ${lineNum}: Missing required fields: ${missing.join(', ')}`);
  }

  const id = parseInt(row[headers.indexOf('id')], 10);
  if (isNaN(id)) throw new Error(`Line ${lineNum}: Invalid id`);

  const price = parseInt(row[headers.indexOf('price')], 10);
  if (isNaN(price) || price < 0) throw new Error(`Line ${lineNum}: Invalid price`);

  const gender = row[headers.indexOf('gender')].trim().toLowerCase();
  if (!['men', 'women'].includes(gender)) {
    throw new Error(`Line ${lineNum}: Invalid gender (must be "men" or "women")`);
  }

  const category = row[headers.indexOf('category')].trim().toLowerCase();
  if (!['auto', 'quartz', 'chrono', 'luxury'].includes(category)) {
    throw new Error(`Line ${lineNum}: Invalid category (must be "auto", "quartz", "chrono", or "luxury")`);
  }

  const stock = row[headers.indexOf('stock')].trim().toLowerCase();
  if (!['in', 'low', 'pre'].includes(stock)) {
    throw new Error(`Line ${lineNum}: Invalid stock (must be "in", "low", or "pre")`);
  }

  return { id, price, gender, category, stock };
}

// Main import function
async function importCSV(csvPath, dryRun = false) {
  console.log(`\n📥 Importing CSV: ${csvPath}`);
  console.log(dryRun ? '🔍 Dry run mode - no changes will be saved\n' : '');

  // Read CSV
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.trim().split('\n').filter(l => l.trim() !== '');

  if (lines.length < 2) {
    throw new Error('CSV file is empty or has only headers');
  }

  // Parse headers
  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
  console.log(`📋 Headers: ${headers.join(', ')}`);

  // Load existing products
  let existingProducts = [];
  if (fs.existsSync(PRODUCTS_FILE)) {
    const data = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf-8'));
    existingProducts = data.products || [];
  }
  console.log(`📦 Existing products: ${existingProducts.length}`);

  // Track results
  const results = { added: 0, updated: 0, errors: 0, skipped: 0 };
  const newProducts = [...existingProducts];

  // Process each row
  for (let i = 1; i < lines.length; i++) {
    const lineNum = i + 1;
    try {
      const row = parseCSVLine(lines[i]);

      if (row.length !== headers.length) {
        throw new Error(`Column count mismatch (expected ${headers.length}, got ${row.length})`);
      }

      // Validate required fields
      const validated = validateRow(row, headers, lineNum);

      // Extract optional fields
      const getOpt = (field) => {
        const idx = headers.indexOf(field);
        return idx !== -1 ? row[idx] : '';
      };

      const name = row[headers.indexOf('name')].trim();
      const brand = row[headers.indexOf('brand')].trim();
      const image = row[headers.indexOf('image')].trim();
      const description = getOpt('description') || '';
      const featured = parseBool(getOpt('featured'));

      // Parse optional JSON fields
      const images = safeParseJSON(getOpt('images'), [image]);
      const variants = safeParseJSON(getOpt('variants'), []);
      const specs = safeParseJSON(getOpt('specs'), {});
      const groupId = getOpt('groupid') || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      // Build product object
      const product = {
        id: validated.id,
        name,
        brand,
        gender: validated.gender,
        category: validated.category,
        stock: validated.stock,
        featured,
        price: validated.price,
        image,
        images: images.length > 0 ? images : [image],
        description,
        specs,
        variants,
        groupId
      };

      // Check if product exists
      const existingIndex = newProducts.findIndex(p => p.id === product.id);

      if (existingIndex !== -1) {
        // Update existing
        if (!dryRun) {
          newProducts[existingIndex] = product;
        }
        results.updated++;
        console.log(`  ♻️  Updated: ${product.name} (id: ${product.id})`);
      } else {
        // Add new
        if (!dryRun) {
          newProducts.push(product);
        }
        results.added++;
        console.log(`  ✅ Added: ${product.name} (id: ${product.id})`);
      }

    } catch (err) {
      results.errors++;
      console.error(`  ❌ Line ${lineNum}: ${err.message}`);
    }
  }

  // Sort by id
  newProducts.sort((a, b) => a.id - b.id);

  // Save if not dry run
  if (!dryRun) {
    const output = {
      version: 1,
      updated: new Date().toISOString(),
      products: newProducts
    };

    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(output, null, 2), 'utf-8');
    console.log(`\n💾 Saved to ${PRODUCTS_FILE}`);
  }

  // Summary
  console.log('\n📊 Import Summary:');
  console.log(`   Added:    ${results.added}`);
  console.log(`   Updated:  ${results.updated}`);
  console.log(`   Errors:   ${results.errors}`);
  console.log(`   Total:    ${newProducts.length} products`);

  if (results.errors > 0) {
    console.log('\n⚠️  Some rows had errors - check output above');
    process.exit(1);
  }

  console.log('\n✨ Done!');
}

// CLI
const args = process.argv.slice(2);
const csvFile = args.find(a => !a.startsWith('--'));
const dryRun = args.includes('--dry-run');

if (!csvFile) {
  console.error('Usage: node scripts/import-csv.js <input.csv> [--dry-run]');
  process.exit(1);
}

const csvPath = path.resolve(csvFile);
if (!fs.existsSync(csvPath)) {
  console.error(`Error: File not found: ${csvPath}`);
  process.exit(1);
}

importCSV(csvPath, dryRun).catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});