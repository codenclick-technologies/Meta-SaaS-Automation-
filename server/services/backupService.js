const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { zip } = require('zip-a-folder');
const config = require('../config');
const crypto = require('crypto');
// Assuming notificationService is correctly set up to emit socket events
// const notificationService = require('./notificationService'); 

const backupDir = path.join(__dirname, '..', 'backups');

if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
}

const cron = require('node-cron');

const runBackup = async () => {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const dumpPath = path.join(backupDir, `dump-${timestamp}`);
    const zipPath = path.join(backupDir, `backup-${timestamp}.zip.enc`);

    console.log('Starting database backup...');
    // notificationService.emitAdminNotification('info', 'Backup Started', 'Database backup process has been initiated.');

    if (!fs.existsSync(dumpPath)) {
        fs.mkdirSync(dumpPath, { recursive: true });
    }

    const command = `mongodump --uri="${config.mongoUri}" --out="${dumpPath}"`;

    exec(command, async (error, stdout, stderr) => {
        if (error) {
            console.error(`Backup failed: ${error.message}`);
            // notificationService.emitAdminNotification('critical', 'Backup Failed', `Mongodump command failed: ${error.message}`);
            return;
        }
        console.log('Database dump successful. Zipping and encrypting...');

        try {
            const tempZipPath = path.join(backupDir, `temp-backup-${timestamp}.zip`);
            await zip(dumpPath, tempZipPath);
            console.log(`Backup zipped to temporary file: ${tempZipPath}`);

            const ENCRYPTION_KEY = process.env.BACKUP_ENCRYPTION_KEY || '64a38e3a2c914e6d9d8f8e8d8c8b8a89'; // Fallback for dev
            if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
                throw new Error('BACKUP_ENCRYPTION_KEY is not set or is too short (must be 32 chars).');
            }
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
            const input = fs.createReadStream(tempZipPath);
            const output = fs.createWriteStream(zipPath);

            output.write(iv);
            input.pipe(cipher).pipe(output);

            output.on('finish', () => {
                console.log(`Backup encrypted successfully at ${zipPath}`);
                // notificationService.emitAdminNotification('success', 'Backup Complete', `Encrypted snapshot created: backup-${timestamp}.zip.enc`);
                fs.unlink(tempZipPath, (err) => { if (err) console.error('Failed to delete temp zip file:', err); });
                fs.rm(dumpPath, { recursive: true, force: true }, (err) => { if (err) console.error('Failed to delete temp dump folder:', err); });
            });
        } catch (zipError) {
            console.error(`Zipping failed: ${zipError}`);
            // notificationService.emitAdminNotification('critical', 'Backup Failed', `Zipping process failed: ${zipError.message}`);
        }
    });
};

const startAutoBackup = () => {
    // Run every night at 2:00 AM
    cron.schedule('0 2 * * *', () => {
        runBackup();
    });
    console.log('[INFO] Automated Cloud Backup system initialized (Schedule: 0 2 * * *)');
};

module.exports = { runBackup, startAutoBackup };

