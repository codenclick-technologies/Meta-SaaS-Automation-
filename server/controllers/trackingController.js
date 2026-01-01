const Lead = require('../models/Lead');
const logger = require('../utils/logger');

exports.trackEmailOpen = async (req, res) => {
    try {
        const leadId = req.params.id;

        // Find lead and update status if not already opened
        const lead = await Lead.findById(leadId);
        if (lead && lead.emailStatus !== 'opened') {
            lead.emailStatus = 'opened';
            await lead.save();
            await logger.dbLog(lead._id, 'email', 'opened');
            console.log(`[Tracking] Email opened by lead: ${lead.email}`);
        }

        // Return a 1x1 transparent GIF
        const img = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
        res.writeHead(200, {
            'Content-Type': 'image/gif',
            'Content-Length': img.length
        });
        res.end(img);
    } catch (error) {
        console.error('Tracking Error:', error);
        res.status(500).end();
    }
};