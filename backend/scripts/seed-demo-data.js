// One-off demo-data seed script (run manually: `node scripts/seed-demo-data.js` from backend/).
// Adds 300 Categories/Locations/Product Types and 2000 Finished SKUs/Inventory Home
// items/Orders, spread across the last ~6 months, so the Dashboard's KPIs/charts have
// substantial, realistic-looking real data instead of the handful of manually-tested rows.
// Purely additive - never deletes or modifies any existing row. Every model's own
// getNextSkuCode()/getNextSkuId()/getNextBomCode() uses COUNT(*)+1, so codes here continue
// that exact sequence (no gaps) to avoid colliding with a future real record's generated code.
const pool = require('../src/config/db');

const MATERIALS = ['Steel', 'Brass', 'Aluminum', 'Plastic', 'Rubber', 'Copper', 'Iron', 'Nylon', 'Zinc', 'Chrome', 'Titanium', 'Ceramic', 'Bronze', 'Alloy', 'Composite'];
const PARTS = ['Handle', 'Hinge', 'Bracket', 'Bearing', 'Bolt', 'Nut', 'Washer', 'Spring', 'Gear', 'Valve', 'Panel', 'Rod', 'Plate', 'Bushing', 'Clamp', 'Fastener', 'Coupling', 'Seal', 'Gasket', 'Screw'];
const WAREHOUSES = ['Main Warehouse', 'North Depot', 'South Depot', 'East Store', 'West Store', 'Central Hub', 'Overflow Yard', 'Distribution Center', 'Regional Hub', 'Cold Storage'];
const PRODUCT_TYPE_NAMES = ['Component', 'Consumable', 'Finished Good', 'Raw Material', 'Spare Part', 'Accessory', 'Tool', 'Packaging', 'Sub-Assembly', 'Fastener Kit'];
const UNITS = ['PCS', 'KG', 'MTR', 'BOX'];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Random instant somewhere in the last `days` days (used to backdate createdAt/createdDate
// so trend charts and "last N months" filters have real spread instead of everything
// clustered at "now").
function randomPastDate(days) {
  const now = Date.now();
  const offsetMs = randomInt(0, days) * 24 * 60 * 60 * 1000 + randomInt(0, 23) * 60 * 60 * 1000;
  return new Date(now - offsetMs);
}

async function insertBatch(client, table, columns, rows, batchSize = 200) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const values = [];
    const placeholders = chunk.map((row, rowIndex) => {
      const base = rowIndex * columns.length;
      values.push(...row);
      return `(${columns.map((_, colIndex) => `$${base + colIndex + 1}`).join(', ')})`;
    });
    const sql = `INSERT INTO ${table} ("${columns.join('", "')}") VALUES ${placeholders.join(', ')}`;
    await client.query(sql, values);
  }
}

async function seedMasters(client) {
  console.log('Seeding Categories, Locations, Product Types (300 each)...');

  const categoryNames = [];
  for (const material of MATERIALS) {
    for (const part of PARTS) {
      categoryNames.push(`${material} ${part}`);
    }
  }
  const categoryRows = categoryNames.map((name) => [name, 'Active', randomPastDate(180)]);
  await insertBatch(client, 'ims_category', ['category', 'status', 'createdAt'], categoryRows);

  const locationNames = [];
  for (const warehouse of WAREHOUSES) {
    for (let zone = 1; zone <= 30; zone += 1) {
      locationNames.push(`${warehouse} - A${zone}`);
    }
  }
  const locationRows = locationNames.map((name) => [name, 'Active', randomPastDate(180)]);
  await insertBatch(client, 'ims_location', ['location', 'status', 'createdAt'], locationRows);

  const productTypeNames = [];
  for (const type of PRODUCT_TYPE_NAMES) {
    for (let grade = 1; grade <= 30; grade += 1) {
      productTypeNames.push(`${type} Grade ${grade}`);
    }
  }
  const productTypeRows = productTypeNames.map((name) => [name, 'Active', randomPastDate(180)]);
  await insertBatch(client, 'ims_product_type', ['productType', 'status', 'createdAt'], productTypeRows);

  console.log(`  ${categoryRows.length} categories, ${locationRows.length} locations, ${productTypeRows.length} product types inserted.`);
}

async function fetchMasterPools(client) {
  const categories = (await client.query('SELECT id, category FROM ims_category')).rows;
  const locations = (await client.query('SELECT id, location FROM ims_location')).rows;
  const productTypes = (await client.query('SELECT id, "productType" FROM ims_product_type')).rows;
  return { categories, locations, productTypes };
}

async function seedRawSkus(client, pools) {
  console.log('Seeding 2000 Finished SKUs...');
  const { rows: countRows } = await client.query('SELECT COUNT(*) FROM ims_raw_sku');
  const startSeq = Number(countRows[0].count) + 1;

  const rawSkus = [];
  for (let i = 0; i < 2000; i += 1) {
    const seq = startSeq + i;
    const skuCode = `SKU-${String(seq).padStart(3, '0')}`;
    const material = pick(MATERIALS);
    const part = pick(PARTS);
    const category = pick(pools.categories);
    const productType = pick(pools.productTypes);
    const location = pick(pools.locations);
    const minStock = randomInt(50, 500);
    const maxStock = minStock + randomInt(1000, 20000);
    const reorderLevel = randomInt(minStock, Math.floor((minStock + maxStock) / 2));
    // ~12% intentionally sit at/below minStock so "Low Stock Alerts" has real, varied data.
    const isLow = Math.random() < 0.12;
    const currentStock = isLow ? randomInt(0, minStock) : randomInt(minStock, maxStock);
    const createdAt = randomPastDate(180);

    rawSkus.push({
      skuCode,
      skuName: `${material} ${part} #${seq}`,
      categoryId: category.id,
      productTypeId: productType.id,
      locationId: location.id,
      unit: pick(UNITS),
      inventoryEntryMode: 'MANUAL',
      sourceType: 'Direct Purchase',
      rawMaterialId: null,
      minStock,
      maxStock,
      reorderLevel,
      openingStock: currentStock,
      currentStock,
      description: null,
      status: Math.random() < 0.05 ? 'Inactive' : 'Active',
      createdBy: 'Admin User',
      createdAt,
    });
  }

  const columns = ['skuCode', 'skuName', 'categoryId', 'productTypeId', 'locationId', 'unit', 'inventoryEntryMode', 'sourceType', 'rawMaterialId', 'minStock', 'maxStock', 'reorderLevel', 'openingStock', 'currentStock', 'description', 'status', 'createdBy', 'createdAt', 'updatedAt'];
  const rows = rawSkus.map((s) => [s.skuCode, s.skuName, s.categoryId, s.productTypeId, s.locationId, s.unit, s.inventoryEntryMode, s.sourceType, s.rawMaterialId, s.minStock, s.maxStock, s.reorderLevel, s.openingStock, s.currentStock, s.description, s.status, s.createdBy, s.createdAt, s.createdAt]);
  await insertBatch(client, 'ims_raw_sku', columns, rows, 100);

  console.log(`  ${rawSkus.length} Finished SKUs inserted (SKU-${String(startSeq).padStart(3, '0')} .. SKU-${String(startSeq + 1999).padStart(3, '0')}).`);
  return rawSkus;
}

async function seedInventories(client, pools, rawSkus) {
  console.log('Seeding 2000 Inventory Home items...');
  const { rows: countRows } = await client.query('SELECT COUNT(*) FROM ims_inventories');
  const startSeq = Number(countRows[0].count) + 1;

  const inventories = [];
  for (let i = 0; i < 2000; i += 1) {
    const seq = startSeq + i;
    const skuId = `SKU-${String(seq).padStart(4, '0')}`;
    const material = pick(MATERIALS);
    const part = pick(PARTS);
    const category = pick(pools.categories);
    const productType = pick(pools.productTypes);
    const location = pick(pools.locations);
    const unit = pick(UNITS);
    const quantity = randomInt(10, 500);
    const unitCost = randomInt(50, 5000);

    const assemblyCount = randomInt(1, 3);
    const assembly = [];
    for (let a = 0; a < assemblyCount; a += 1) {
      const sku = pick(rawSkus);
      assembly.push({ skuCode: sku.skuCode, skuName: sku.skuName, quantity: randomInt(1, 20), unit: sku.unit });
    }

    inventories.push({
      skuId,
      productName: `${material} ${part} Assembly #${seq}`,
      categoryName: category.category,
      productType: productType.productType,
      barcode: String(randomInt(1000000000, 9999999999)),
      quantity,
      unit,
      locationName: location.location,
      status: Math.random() < 0.05 ? 'Inactive' : 'Active',
      unitCost,
      createdDate: randomPastDate(180),
      assembly,
    });
  }

  const columns = ['images', 'skuId', 'productName', 'categoryName', 'productType', 'barcode', 'quantity', 'unit', 'locationName', 'status', 'unitCost', 'createdDate', 'assembly', 'updatedAt'];
  const rows = inventories.map((item) => [
    JSON.stringify([]),
    item.skuId,
    item.productName,
    item.categoryName,
    item.productType,
    item.barcode,
    item.quantity,
    item.unit,
    item.locationName,
    item.status,
    item.unitCost,
    item.createdDate,
    JSON.stringify(item.assembly),
    item.createdDate,
  ]);
  await insertBatch(client, 'ims_inventories', columns, rows, 100);

  console.log(`  ${inventories.length} Inventory Home items inserted (SKU-${String(startSeq).padStart(4, '0')} .. SKU-${String(startSeq + 1999).padStart(4, '0')}).`);
  return inventories;
}

async function seedBoms(client, inventories, rawSkus) {
  console.log('Seeding 2000 Orders...');
  const { rows: countRows } = await client.query('SELECT COUNT(*) FROM ims_bom');
  const startSeq = Number(countRows[0].count) + 1;

  const threeMonthsMs = 90 * 24 * 60 * 60 * 1000;
  const rows = [];
  for (let i = 0; i < 2000; i += 1) {
    const seq = startSeq + i;
    const bomCode = `BOM-${String(seq).padStart(4, '0')}`;
    const product = pick(inventories);
    const outputQty = randomInt(1, 100);
    const createdAt = randomPastDate(180);
    // Orders created within the last 3 months lean Dispatch (65%) so "Orders Dispatched
    // (This Month)" and the "SKU Movement" panels have real, meaningful data; older ones
    // are an even split.
    const withinLast3Months = Date.now() - createdAt.getTime() <= threeMonthsMs;
    const status = Math.random() < (withinLast3Months ? 0.65 : 0.5) ? 'Dispatch' : 'Process';
    // A dispatched Order's updatedAt is some days after it was created (the actual dispatch
    // moment); a Process Order has never been touched since creation.
    const updatedAt = status === 'Dispatch'
      ? new Date(Math.min(Date.now(), createdAt.getTime() + randomInt(0, 10) * 24 * 60 * 60 * 1000))
      : createdAt;

    const itemCount = randomInt(1, 4);
    const items = [];
    for (let it = 0; it < itemCount; it += 1) {
      const sku = pick(rawSkus);
      items.push({ rawSkuCode: sku.skuCode, rawSkuName: sku.skuName, requiredQty: randomInt(1, 20), unit: sku.unit, remarks: '' });
    }

    rows.push([
      bomCode,
      product.skuId,
      product.productName,
      product.categoryName,
      '1.0',
      outputQty,
      product.unit,
      status,
      JSON.stringify(items),
      'Admin User',
      createdAt,
      updatedAt,
    ]);
  }

  const columns = ['bomCode', 'productSku', 'productName', 'categoryName', 'version', 'outputQty', 'unit', 'status', 'items', 'createdBy', 'createdAt', 'updatedAt'];
  await insertBatch(client, 'ims_bom', columns, rows, 100);

  console.log(`  ${rows.length} Orders inserted (BOM-${String(startSeq).padStart(4, '0')} .. BOM-${String(startSeq + 1999).padStart(4, '0')}).`);
}

async function main() {
  const client = await pool.connect();
  try {
    await seedMasters(client);
    const pools = await fetchMasterPools(client);
    const rawSkus = await seedRawSkus(client, pools);
    const inventories = await seedInventories(client, pools, rawSkus);
    await seedBoms(client, inventories, rawSkus);
    console.log('Done.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
