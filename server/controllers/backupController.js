const backupService = require('../services/backupService');

/**
 * @desc    Trigger a manual backup
 * @route   POST /api/security/backup/now
 * @access  Private (Admin)
 */
exports.triggerManualBackup = async (req, res) => {
    try {
        // The runBackup function is asynchronous but we don't need to wait for it.
        // It will run in the background and send a socket notification on completion.
        backupService.runBackup();

        // Respond to the admin immediately.
        res.status(202).json({ success: true, message: 'Manual backup process initiated. You will receive a notification upon completion.' });

    } catch (error) {
        console.error('Manual Backup Trigger Error:', error);
        res.status(500).json({ success: false, error: 'Failed to start manual backup process.' });
    }
};