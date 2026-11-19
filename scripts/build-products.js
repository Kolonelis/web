#!/usr/bin/env node
/**
 * build-products.js — Build products.js from data/products.json
 *
 * This script transforms the canonical products.json into a browser-ready products.js
 * that exposes: PRODUCTS, CATEGORIES, GENDERS, STOCK constants.
 *
 * Usage:
 *   node scripts/build-products.js
 *   node scripts/build-products.js --watch  (not implemented, use nodemon)
 *
 * Output: js/products.js
 */

const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.resolve(__dirname, '../data/products.json');
const OUTPUT_FILE = path.resolve(__dirname, '../js/products.js');

function build() {
  console.log('🔨 Building products.js...');

  // Read source data
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Error: Source file not found: ${INPUT_FILE}`);
    process.exit(1);
  }

  const source = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
  const products = source.products || [];

  if (!Array.isArray(products) || products.length === 0) {
    console.error('Error: No products found in source data');
    process.exit(1);
  }

  console.log(`📦 Loaded ${products.length} products`);

  // Validate each product has required fields
  const requiredFields = ['id', 'name', 'brand', 'gender', 'category', 'stock', 'price', 'image'];
  products.forEach((p, i) => {
    const missing = requiredFields.filter(f => p[f] === undefined || p[f] === null || p[f] === '');
    if (missing.length > 0) {
      console.warn(`⚠️  Product at index ${i} (${p.name || 'unknown'}): missing fields: ${missing.join(', ')}`);
    }
  });

  // Define constants
  const CATEGORIES = {
    auto: 'Автоматичні',
    quartz: 'Кварцові',
    chrono: 'Хронографи',
    luxury: 'Люкс',
  };

  const GENDERS = {
    men: 'Чоловічі годинники',
    women: 'Жіночі годинники',
  };

  const STOCK = {
    in: 'В наявності',
    low: 'Закінчується',
    pre: 'Під замовлення',
  };

  // Generate output
  const output = `// Автозгенеровано з data/products.json — НЕ РЕДАГУВАТИ ВРУЧНУ
// Запустіть: node scripts/build-products.js

const CATEGORIES = ${JSON.stringify(CATEGORIES, null, 2)};

const GENDERS = ${JSON.stringify(GENDERS, null, 2)};

const STOCK = ${JSON.stringify(STOCK, null, 2)};

const PRODUCTS = ${JSON.stringify(products, null, 2)};

// Експорт для браузера
if (typeof window !== 'undefined') {
  window.CATEGORIES = CATEGORIES;
  window.GENDERS = GENDERS;
  window.STOCK = STOCK;
  window.PRODUCTS = PRODUCTS;
}

// Для Node/ESM
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CATEGORIES, GENDERS, STOCK, PRODUCTS };
}
`;

  // Write output
  fs.writeFileSync(OUTPUT_FILE, output, 'utf-8');
  console.log(`✅ Written to ${OUTPUT_FILE}`);
  console.log(`📦 ${products.length} products ready for frontend`);

  // Also generate a minified version
  const minOutput = `const CATEGORIES=${JSON.stringify(CATEGORIES)},GENDERS=${JSON.stringify(GENDERS)},STOCK=${JSON.stringify(STOCK)},PRODUCTS=${JSON.stringify(products)};if(typeof window!=="undefined"){window.CATEGORIES=CATEGORIES;window.GENDERS=GENDERS;window.STOCK=STOCK;window.PRODUCTS=PRODUCTS}if(typeof module!=="undefined"&&module.exports)module.exports={CATEGORIES,GENDERS,STOCK,PRODUCTS};`;
  fs.writeFileSync(OUTPUT_FILE.replace('.js', '.min.js'), minOutput, 'utf-8');
  console.log(`✅ Minified version written to ${OUTPUT_FILE.replace('.js', '.min.js')}`);

  // Stats
  const byGender = products.reduce((acc, p) => {
    acc[p.gender] = (acc[p.gender] || 0) + 1;
    return acc;
  }, {});
  const byCategory = products.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {});
  const byStock = products.reduce((acc, p) => {
    acc[p.stock] = (acc[p.stock] || 0) + 1;
    return acc;
  }, {});
  const featured = products.filter(p => p.featured).length;

  console.log('\n📊 Catalog Stats:');
  console.log(`   Men:     ${byGender.men || 0}`);
  console.log(`   Women:   ${byGender.women || 0}`);
  console.log(`   Auto:    ${byCategory.auto || 0}`);
  console.log(`   Quartz:  ${byCategory.quartz || 0}`);
  console.log(`   Chrono:  ${byCategory.chrono || 0}`);
  console.log(`   Luxury:  ${byCategory.luxury || 0}`);
  console.log(`   In stock: ${byStock.in || 0}`);
  console.log(`   Low:      ${byStock.low || 0}`);
  console.log(`   Pre-order: ${byStock.pre || 0}`);
  console.log(`   Featured: ${featured}`);
}

build();