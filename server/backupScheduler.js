const cron = require('node-cron');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const config = require('./config');

const cleanupOldBackups = (backupDir, daysToKeep) => {
    fs.readdir(backupDir, (err, files) => {
        if (err) {
            console.error('Could not list backup directory for cleanup:', err);
            return;
        }

        const cutoff = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);

        files.forEach(file => {
            const filePath = path.join(backupDir, file);
            fs.stat(filePath, (err, stat) => {
                if (err) return;
                if (stat.mtime.getTime() < cutoff) {
                    fs.rm(filePath, { recursive: true, force: true }, (err) => {
                        if (err) console.error(`Failed to delete old backup ${filePath}:`, err);
                        else console.log(`Deleted old backup: ${file}`);
                    });
                }
            });
        });
    });
};

module.exports = () => {
    // Run every night at 2:00 AM
    cron.schedule('0 2 * * *', () => {
        console.log('Starting nightly database backup...');

        const backupDir = path.join(__dirname, '../backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const date = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(backupDir, `backup-${date}`);

        // Construct mongodump command
        // Note: Ensure 'mongodump' is installed and available in your system PATH
        // For Atlas, the URI is usually sufficient.
        const cmd = `mongodump --uri="${config.mongoUri}" --out="${backupPath}"`;

        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.error(`Backup failed: ${error.message}`);
                return;
            }
            if (stderr) {
                // mongodump writes progress to stderr, so we log it but don't treat it as a failure unless error is set
                console.log(`Backup progress: ${stderr}`);
            }
            console.log(`Backup successful! Saved to: ${backupPath}`);

            // Delete backups older than 7 days
            cleanupOldBackups(backupDir, 7);
        });
    });

    console.log('Backup scheduler initialized (Runs daily at 2:00 AM)');
};