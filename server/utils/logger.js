const Log = require('../models/Log');

const logger = {
    info: (message) => {
        console.log(`[INFO] ${new Date().toISOString()}: ${message}`);
    },
    error: (message, error) => {
        console.error(`[ERROR] ${new Date().toISOString()}: ${message}`, error);
    },
    // DB Logger to save communication logs
    dbLog: async (leadId, channel, status, response = {}) => {
        try {
            await Log.create({
                leadId,
                channel,
                status,
                response,
                timestamp: new Date()
            });
            console.log(`[DB-LOG] ${channel} status for Lead ${leadId}: ${status}`);
        } catch (err) {
            console.error('[DB-LOG-ERROR] Failed to save log:', err);
        }
    }
};

module.exports = logger;
