const ComplianceLog = require('../models/ComplianceLog');
const logger = require('./logger');

class AuditService {
    /**
     * Log a compliance-sensitive event
     */
    static async log(data) {
        try {
            const entry = new ComplianceLog({
                organizationId: data.organizationId,
                userId: data.userId,
                action: data.action,
                category: data.category || 'GDPR',
                targetId: data.targetId,
                details: data.details,
                ipAddress: data.ipAddress,
                userAgent: data.userAgent
            });
            await entry.save();
            logger.info(`Audit: Compliance log created for action [${data.action}] in Org [${data.organizationId}]`);
        } catch (error) {
            logger.error('Failed to create Compliance Log:', error.message);
        }
    }

    /**
     * Quick log for PII Access
     */
    static async logPIIAccess(userId, organizationId, leadId, ipAddress = 'internal') {
        return this.log({
            userId,
            organizationId,
            action: 'PII_VIEW',
            targetId: leadId,
            details: { message: 'User viewed protected Lead contact information' },
            ipAddress
        });
    }
}

module.exports = AuditService;
