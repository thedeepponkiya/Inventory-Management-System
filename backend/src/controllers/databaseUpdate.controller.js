const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const { createDatabaseBackup } = require('../utils/databaseBackup.util');
const { getPendingSchemaChanges } = require('../utils/databaseSchemaPreview.util');

const CONFIRM_PHRASE = 'UPDATE';
const SCHEMA_PATH = path.join(__dirname, '../db/schema.sql');

// Read-only diff of schema.sql against the live database - see
// databaseSchemaPreview.util.js's own comment for exactly how each category is computed.
// Same isHidden gate as updateDatabase below (this still exposes internal schema shape), but
// no confirm phrase - nothing is applied here, it's purely informational, shown in the
// frontend's confirm dialog before the admin decides whether to actually run the update.
async function previewDatabaseUpdate(req, res) {
    if (!req.user?.isHidden) {
        return res.status(403).json({ status: false, message: 'Not authorized to view the database update preview', data: null });
    }
    try {
        const changes = await getPendingSchemaChanges();
        res.json({ status: true, message: 'Pending schema changes fetched successfully', data: changes });
    } catch (err) {
        res.status(500).json({ status: false, message: `Could not compute pending changes: ${err.message}`, data: null });
    }
}

// Same isHidden + typed-confirm-phrase double gate as databaseReset.controller.js (see its
// own comment for why isHidden is checked server-side here rather than trusted from the
// frontend hiding the menu item) - a different phrase ("UPDATE" vs "RESET") so the two
// actions can never be confused/typo'd into each other.
//
// Unlike Reset, this never TRUNCATEs/DROPs a table and never touches row data directly:
// schema.sql is written entirely as CREATE TABLE IF NOT EXISTS / ALTER TABLE ... ADD COLUMN
// IF NOT EXISTS / guarded DO $$ rename blocks, plus a handful of ALTER TABLE ... DROP COLUMN
// IF EXISTS entries left over from earlier features that were tried and then walked back (see
// the file's own comments on each) - those are the one category here that's genuinely
// irreversible if that column still holds data on THIS database, which is exactly why
// previewDatabaseUpdate above calls that category out separately for the admin to review
// before confirming, rather than silently lumping it in with the purely-additive changes.
//
// The backup step runs FIRST and the schema apply is skipped entirely if it fails, so a
// broken backup (e.g. pg_dump missing) can never be followed by an unbacked-up schema change.
async function updateDatabase(req, res) {
    if (!req.user?.isHidden) {
        return res.status(403).json({ status: false, message: 'Not authorized to perform a database update', data: null });
    }
    if (req.body?.confirm !== CONFIRM_PHRASE) {
        return res.status(400).json({ status: false, message: `Type "${CONFIRM_PHRASE}" to confirm this action`, data: null });
    }

    let backup;
    try {
        backup = await createDatabaseBackup();
    } catch (err) {
        return res.status(500).json({ status: false, message: err.message, data: null });
    }

    try {
        const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf8');
        // One multi-statement call (schema.sql has no $1-style parameters anywhere - confirmed
        // by inspection) - node-postgres's simple query protocol runs a ;-separated batch of
        // plain SQL statements in one round trip, same as `psql -f schema.sql` would.
        await pool.query(schemaSql);
        res.json({
            status: true,
            message: `Database backed up and updated successfully. Backup saved as ${backup.fileName}.`,
            data: { backupFile: backup.fileName, backupSizeBytes: backup.sizeBytes },
        });
    } catch (err) {
        console.error(err);
        // sendServerError hides raw error text behind a generic message unless statusCode is
        // set - deliberately bypassed here (a custom message, not raw Postgres/driver text) so
        // the admin actually sees that the backup already succeeded and is safe on disk even
        // though the schema apply itself failed, instead of just a generic failure toast.
        res.status(500).json({
            status: false,
            message: `Schema update failed: ${err.message}. A pre-update backup was still saved as ${backup.fileName}.`,
            data: null,
        });
    }
}

module.exports = { previewDatabaseUpdate, updateDatabase };
