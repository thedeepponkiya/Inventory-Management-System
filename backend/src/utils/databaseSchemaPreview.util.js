const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

const SCHEMA_PATH = path.join(__dirname, '../db/schema.sql');

// Regex-extracted (not a real SQL parser) - schema.sql only ever uses these six DDL shapes,
// each on a single logical statement, so this is reliable for this one file without pulling
// in a full SQL parser dependency. See schema.sql's own house style for why every one of
// these is written IF [NOT] EXISTS in the first place (idempotent, safe to re-run).
const PATTERNS = {
    newTable: /CREATE TABLE IF NOT EXISTS\s+"?(\w+)"?/gi,
    dropTable: /DROP TABLE IF EXISTS\s+"?(\w+)"?/gi,
    addColumn: /ALTER TABLE\s+"?(\w+)"?\s+ADD COLUMN IF NOT EXISTS\s+"?(\w+)"?/gi,
    dropColumn: /ALTER TABLE\s+"?(\w+)"?\s+DROP COLUMN IF EXISTS\s+"?(\w+)"?/gi,
    renameColumn: /ALTER TABLE\s+"?(\w+)"?\s+RENAME COLUMN\s+"?(\w+)"?\s+TO\s+"?(\w+)"?/gi,
    newIndex: /CREATE (?:UNIQUE )?INDEX IF NOT EXISTS\s+"?(\w+)"?\s+ON\s+"?(\w+)"?/gi,
};

async function tableExists(tableName) {
    const result = await pool.query('SELECT to_regclass($1) IS NOT NULL AS exists', [tableName]);
    return result.rows[0].exists;
}

async function columnExists(tableName, columnName) {
    const result = await pool.query(
        'SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2',
        [tableName, columnName]
    );
    return result.rowCount > 0;
}

// Diffs schema.sql against the live database WITHOUT applying anything - pure information_schema
// reads. Used to show the admin exactly what a Database Update would do before they confirm it,
// with removedColumns called out separately (deliberately, not lumped in with the additive
// categories) since - unlike every other category here - dropping a column that still has data
// in it is the one genuinely irreversible part of running schema.sql, addColumn/newTable/
// renameColumn are all either purely additive or data-preserving.
async function getPendingSchemaChanges() {
    const sql = fs.readFileSync(SCHEMA_PATH, 'utf8');

    const newTableNames = [...sql.matchAll(PATTERNS.newTable)].map((m) => m[1]);
    const existingTableSet = new Set();
    const pendingNewTables = [];
    for (const name of new Set(newTableNames)) {
        // eslint-disable-next-line no-await-in-loop
        if (await tableExists(name)) {
            existingTableSet.add(name);
        } else {
            pendingNewTables.push(name);
        }
    }
    const pendingNewTableSet = new Set(pendingNewTables);

    // The other genuinely destructive category alongside removedColumns below - a DROP TABLE
    // taking effect on a database that still has that table (and whatever rows are in it).
    const dropTableNames = [...sql.matchAll(PATTERNS.dropTable)].map((m) => m[1]);
    const pendingDroppedTables = [];
    for (const name of new Set(dropTableNames)) {
        // eslint-disable-next-line no-await-in-loop
        if (await tableExists(name)) {
            pendingDroppedTables.push(name);
        }
    }

    const pendingNewColumns = [];
    for (const m of sql.matchAll(PATTERNS.addColumn)) {
        const [, table, column] = m;
        // A brand-new table's columns all arrive for free with its own CREATE TABLE - no need
        // to also list them individually.
        if (pendingNewTableSet.has(table)) continue;
        // eslint-disable-next-line no-await-in-loop
        if (!(await columnExists(table, column))) {
            pendingNewColumns.push({ table, column });
        }
    }

    const pendingRemovedColumns = [];
    for (const m of sql.matchAll(PATTERNS.dropColumn)) {
        const [, table, column] = m;
        if (pendingNewTableSet.has(table)) continue;
        // eslint-disable-next-line no-await-in-loop
        if (await columnExists(table, column)) {
            pendingRemovedColumns.push({ table, column });
        }
    }

    const pendingRenamedColumns = [];
    for (const m of sql.matchAll(PATTERNS.renameColumn)) {
        const [, table, fromColumn, toColumn] = m;
        if (pendingNewTableSet.has(table)) continue;
        // eslint-disable-next-line no-await-in-loop
        if (await columnExists(table, fromColumn)) {
            pendingRenamedColumns.push({ table, fromColumn, toColumn });
        }
    }

    const pendingNewIndexes = [];
    for (const m of sql.matchAll(PATTERNS.newIndex)) {
        const [, indexName, table] = m;
        if (pendingNewTableSet.has(table)) continue;
        // eslint-disable-next-line no-await-in-loop
        if (!(await tableExists(indexName))) {
            pendingNewIndexes.push({ indexName, table });
        }
    }

    return {
        newTables: pendingNewTables,
        droppedTables: pendingDroppedTables,
        newColumns: pendingNewColumns,
        removedColumns: pendingRemovedColumns,
        renamedColumns: pendingRenamedColumns,
        newIndexes: pendingNewIndexes,
    };
}

module.exports = { getPendingSchemaChanges };
