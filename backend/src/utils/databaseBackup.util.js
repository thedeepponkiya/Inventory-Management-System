const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const BACKUP_DIR = path.join(__dirname, '../../backups');

// Plain-SQL format (`-F p`), not the compressed custom format - restorable with a plain
// `psql -f backup.sql` on any machine with just the Postgres client tools, no pg_restore or
// matching pg_dump version required to read it back.
function buildBackupFileName() {
    const now = new Date();
    const stamp = now.toISOString().replace(/:/g, '-').replace(/\..+/, '');
    return `backup_${stamp}.sql`;
}

// Shells out to pg_dump (same host as the Postgres server itself in this app's deployment -
// see ecosystem.config.js/deploy/nginx.conf.example, a single-VPS CyberPanel setup, not
// containerized) rather than reimplementing dump logic - execFile (not exec) passes args as
// an array instead of a shell string, so nothing here is vulnerable to shell injection even
// though every value used is already sourced from our own trusted env vars, not user input.
// The DB password is passed via the PGPASSWORD env var (pg_dump's own documented mechanism
// for non-interactive auth), never as a CLI argument, so it never shows up in a process list.
function createDatabaseBackup() {
    return new Promise((resolve, reject) => {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
        const fileName = buildBackupFileName();
        const filePath = path.join(BACKUP_DIR, fileName);

        const args = [
            '-h', process.env.DB_HOST,
            '-p', String(process.env.DB_PORT),
            '-U', process.env.DB_USER,
            '-F', 'p',
            '-f', filePath,
            process.env.DB_NAME,
        ];

        execFile('pg_dump', args, { env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD } }, (err) => {
            if (err) {
                // pg_dump missing from PATH is the most likely failure mode on a fresh host -
                // called out explicitly since Node's default ENOENT message ("spawn pg_dump
                // ENOENT") isn't self-explanatory to whoever reads this error in the UI.
                if (err.code === 'ENOENT') {
                    return reject(new Error('pg_dump was not found on this server - install the PostgreSQL client tools before running a database update.'));
                }
                return reject(new Error(`Database backup failed: ${err.message}`)); 
            }
            let sizeBytes = 0;
            try {
                sizeBytes = fs.statSync(filePath).size;
            } catch {
                // Backup command reported success but the file is somehow unreadable - surface
                // 0 rather than letting a stat error mask the otherwise-successful backup.
            }
            resolve({ fileName, filePath, sizeBytes });
        });
    });
}

module.exports = { createDatabaseBackup, BACKUP_DIR };
