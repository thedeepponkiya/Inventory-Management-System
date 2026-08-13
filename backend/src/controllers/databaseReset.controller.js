const { sendServerError } = require('../utils/errorResponse');
const pool = require('../config/db');
const { TABLES_TO_RESET, resetBusinessData } = require('../models/databaseReset.model');

const CONFIRM_PHRASE = 'RESET';

// This app has no RBAC anywhere else - any authenticated session already has full API
// access regardless of roleId. isHidden is therefore the ONLY server-side gate standing
// between any logged-in user and wiping every order/lead/inventory record in the system, so
// it's checked here explicitly rather than trusted from the frontend hiding the menu item.
// The typed confirm phrase is a second, independent guard against an accidental/replayed
// request from the one account that IS allowed to call this.
async function resetDatabase(req, res) {
    if (!req.user?.isHidden) {
        return res.status(403).json({ status: false, message: 'Not authorized to perform a database reset', data: null });
    }
    if (req.body?.confirm !== CONFIRM_PHRASE) {
        return res.status(400).json({ status: false, message: `Type "${CONFIRM_PHRASE}" to confirm this action`, data: null });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await resetBusinessData(client);
        await client.query('COMMIT');
        res.json({ status: true, message: 'All business data has been reset', data: { tables: TABLES_TO_RESET } });
    } catch (err) {
        await client.query('ROLLBACK');
        sendServerError(res, err);
    } finally {
        client.release();
    }
}

module.exports = { resetDatabase };
