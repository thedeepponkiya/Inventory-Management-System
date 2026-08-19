const pool = require('../config/db');
const { resetBusinessData } = require('../models/databaseReset.model');
const { createDatabaseBackup } = require('../utils/databaseBackup.util');

const CONFIRM_PHRASE = 'RESET';

// This app has no RBAC anywhere else - any authenticated session already has full API
// access regardless of roleId. isHidden is therefore the ONLY server-side gate standing
// between any logged-in user and wiping every order/lead/inventory record in the system, so
// it's checked here explicitly rather than trusted from the frontend hiding the menu item.
// The typed confirm phrase is a second, independent guard against an accidental/replayed
// request from the one account that IS allowed to call this.
//
// A pg_dump backup is taken first (same helper/mechanism as Database Update) before anything
// is truncated - this action still permanently clears the tables (there's no "restore"
// button anywhere in the app), but it's no longer unrecoverable: the dump file on disk is
// enough to manually restore with `psql -f` if a reset ever turns out to have been a mistake
// (wrong environment, or a table that shouldn't have been kept/cleared). If the backup itself
// fails, the reset is aborted before anything is touched.
async function resetDatabase(req, res) {
    if (!req.user?.isHidden) {
        return res.status(403).json({ status: false, message: 'Not authorized to perform a database reset', data: null });
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

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const tables = await resetBusinessData(client);
        await client.query('COMMIT');
        res.json({
            status: true,
            message: `Database backed up and reset successfully. Backup saved as ${backup.fileName}.`,
            data: { tables, backupFile: backup.fileName, backupSizeBytes: backup.sizeBytes },
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({
            status: false,
            message: `Database reset failed: ${err.message}. A pre-reset backup was still saved as ${backup.fileName}.`,
            data: null,
        });
    } finally {
        client.release();
    }
}

module.exports = { resetDatabase };
