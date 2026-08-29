// Shared by inventory.controller.js and rawSku.controller.js - both items had none of this
// validation at all: any stock/cost field could be saved negative (through a negative typed
// straight into an InputNumber with no `min`, or via a direct API call regardless of the
// frontend), and maxStock < minStock was silently accepted, permanently breaking the
// Low/Normal/High stock-level badge logic (getStockLevel in CommonUtilities.tsx) for that row.

// null/undefined/0 are all treated as "not one of the fields being checked" - every numeric
// stock/cost field on these two forms already defaults to 0 rather than being left unset, so a
// bare `< 0` check (not `<= 0`) is what actually catches a real negative without also rejecting
// a legitimately-zero field (e.g. a brand new SKU with no stock yet).
function findNegativeField(fields) {
  for (const [name, value] of Object.entries(fields)) {
    if (value === null || value === undefined) continue;
    if (Number(value) < 0) return name;
  }
  return null;
}

// maxStock of 0 means "no max configured" (the same sentinel minStock/openingStock already
// use elsewhere in this app) rather than "the max is literally zero", so it's only compared
// once it's actually been set to something.
function validateStockRange(minStock, maxStock) {
  const min = Number(minStock) || 0;
  const max = Number(maxStock) || 0;
  if (max > 0 && max < min) {
    return `Max Stock (${max}) cannot be less than Min Stock (${min})`;
  }
  return null;
}

// Used by inventory.controller.js only (Raw SKU has no assembly). A zero or negative line
// quantity here is worse than a bad input - it flows straight into bom.controller.js's
// completeBomItem as `needed = line.quantity * requiredQty`, and a negative `needed` both
// flips the stock adjustment's sign (crediting the Finished SKU instead of debiting it) and
// can never exceed `available`, silently bypassing the shortage check entirely.
function findInvalidAssemblyLine(assembly) {
  return (assembly || []).find((line) => !(Number(line.quantity) > 0));
}

module.exports = { findNegativeField, validateStockRange, findInvalidAssemblyLine };
