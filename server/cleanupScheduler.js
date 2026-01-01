const cron = require('node-cron');
const Lead = require('./models/Lead');
const Settings = require('./models/Settings');

module.exports = () => {
    // Run every day at 3:00 AM
    cron.schedule('0 3 * * *', async () => {
        console.log('Running old leads cleanup job...');
        try {
            const settings = await Settings.getSettings();
            const daysToKeep = settings.leadRetentionDays || 90;

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

            const result = await Lead.deleteMany({
                createdAt: { $lt: cutoffDate },
                status: { $ne: 'Converted' } // Optional: Don't delete converted leads
            });

            if (result.deletedCount > 0) {
                console.log(`Cleanup successful: Deleted ${result.deletedCount} leads older than ${daysToKeep} days.`);
            }
        } catch (error) {
            console.error('Error during lead cleanup:', error);
        }
    });

    console.log(`Cleanup scheduler initialized.`);
};