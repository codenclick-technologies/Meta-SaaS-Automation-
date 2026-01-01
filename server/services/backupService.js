const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const AuditLog = require('../models/AuditLog');

class BackupService {
    constructor() {
        this.backupDir = path.join(__dirname, '../backups');
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
    }

    /**
     * Performs a full system backup (JSON Dump)
     * In a production environment, this would upload to AWS S3 or Google Cloud Storage.
     */
    async performFullBackup() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(this.backupDir, `system-backup-${timestamp}.json`);

        try {
            const collections = Object.keys(mongoose.connection.collections);
            const backupData = {};

            for (const colName of collections) {
                const data = await mongoose.connection.collection(colName).find({}).toArray();
                backupData[colName] = data;
            }

            fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));

            logger.info(`Full backup completed: ${backupPath}`);

            // Log this as a security event
            await new AuditLog({
                action: 'SYSTEM_BACKUP',
                resource: 'DATABASE',
                status: 'success',
                metadata: { filePath: backupPath, size: fs.statSync(backupPath).size }
            }).save();

            return { success: true, path: backupPath };
        } catch (error) {
            logger.error('Backup failed', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Schedules automated backups using cron
     */
    startAutoBackup() {
        const cron = require('node-cron');
        // Schedule back up at 2:00 AM every day
        cron.schedule('0 2 * * *', () => {
            logger.info('Starting scheduled nightly backup...');
            this.performFullBackup();
        });
        logger.info('Automated Cloud Backup system initialized (Schedule: 0 2 * * *)');
    }
}

module.exports = new BackupService();
